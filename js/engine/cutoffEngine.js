/**
 * Analyzes an array of historical cutoffs to extract statistical boundaries.
 * Note: A smaller rank number is better/more competitive.
 */

export function analyzeCutoffs(cutoffsArray) {
    if (!cutoffsArray || cutoffsArray.length === 0) {
        return {
            hasData: false,
            latestClosingRank: null,
            bestClosingRank: null,
            worstClosingRank: null,
            medianClosingRank: null,
            averageClosingRank: null,
            latestYear: null,
            latestRound: null,
            historicalRoundsAvailable: 0,
            confidence: 'Insufficient',
            roundMovement: null,
            yoyMovement: null
        };
    }

    let bestRank = Infinity;
    let worstRank = -Infinity;
    let latestYear = -1;
    let latestRound = -1;
    let latestClosingRank = null;
    let latestAIRank = null;
    let totalRank = 0;
    
    const validRanks = [];
    const yearRounds = {}; // structure: { 2024: { 1: 5000, 2: 5200 }, 2025: { ... } }

    for (let i = 0; i < cutoffsArray.length; i++) {
        const c = cutoffsArray[i];
        
        if (c.closingRank !== null && c.closingRank !== undefined) {
            validRanks.push(c.closingRank);
            totalRank += c.closingRank;
            
            if (!yearRounds[c.year]) yearRounds[c.year] = {};
            yearRounds[c.year][c.round] = c.closingRank;
            
            // Smaller rank number = better = harder to get
            if (c.closingRank < bestRank) bestRank = c.closingRank;
            if (c.closingRank > worstRank) worstRank = c.closingRank;
            
            // Find latest
            if (c.year > latestYear || (c.year === latestYear && c.round > latestRound)) {
                latestYear = c.year;
                latestRound = c.round;
                latestClosingRank = c.closingRank;
                latestAIRank = c.aiRank || null;
            }
        }
    }

    if (validRanks.length === 0) {
        return { hasData: false, confidence: 'Insufficient' };
    }

    // Calculate median and average
    validRanks.sort((a, b) => a - b);
    let medianRank;
    const mid = Math.floor(validRanks.length / 2);
    if (validRanks.length % 2 === 0) {
        medianRank = (validRanks[mid - 1] + validRanks[mid]) / 2;
    } else {
        medianRank = validRanks[mid];
    }
    const averageRank = Math.round(totalRank / validRanks.length);

    // Calculate Movements
    let roundMovement = null;
    let yoyMovement = null;
    
    // Round movement (Latest Year: R1 vs Latest Round)
    if (yearRounds[latestYear]) {
        const roundsInLatestYear = Object.keys(yearRounds[latestYear]).map(Number).sort((a,b) => a-b);
        if (roundsInLatestYear.length > 1) {
            const firstRound = roundsInLatestYear[0];
            const firstRank = yearRounds[latestYear][firstRound];
            // Movement: Positive means rank went up (easiest to get in later rounds)
            roundMovement = latestClosingRank - firstRank; 
        }
    }
    
    // YoY Movement (Latest Year Latest Round vs Previous Year Same Round)
    const prevYears = Object.keys(yearRounds).map(Number).filter(y => y < latestYear).sort((a,b) => b-a);
    if (prevYears.length > 0) {
        const nearestPrevYear = prevYears[0];
        // Try to match the exact same round, else fallback to the last round of prev year
        const prevYearRounds = Object.keys(yearRounds[nearestPrevYear]).map(Number).sort((a,b)=>b-a);
        const matchedRound = yearRounds[nearestPrevYear][latestRound] ? latestRound : prevYearRounds[0];
        const prevRank = yearRounds[nearestPrevYear][matchedRound];
        yoyMovement = latestClosingRank - prevRank; // Positive means rank went up (easier to get this year vs last year)
    }

    // Determine Confidence
    const numYears = Object.keys(yearRounds).length;
    const numObservations = validRanks.length;
    let confidence = 'Insufficient';
    
    if (numYears >= 2 && numObservations >= 4) {
        confidence = 'High';
    } else if ((numYears === 1 && numObservations >= 2) || (numYears >= 2 && numObservations < 4)) {
        confidence = 'Medium';
    } else if (numObservations <= 2) {
        confidence = 'Low';
    }

    return {
        hasData: true,
        latestClosingRank: latestClosingRank,
        latestAIRank: latestAIRank,
        bestClosingRank: bestRank,
        worstClosingRank: worstRank,
        medianClosingRank: Math.round(medianRank),
        averageClosingRank: averageRank,
        latestYear: latestYear,
        latestRound: latestRound,
        historicalRoundsAvailable: validRanks.length,
        confidence,
        roundMovement,
        yoyMovement
    };
}
