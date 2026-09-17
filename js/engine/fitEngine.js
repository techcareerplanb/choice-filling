/**
 * Assesses the user's fit against analyzed historical cutoffs.
 * 
 * CORE MATCHING LOGIC:
 * Smaller AIR = Better/More Competitive.
 * If userAIR = 50,000 and closingRank = 60,000, margin = +10,000 (Safe).
 * If userAIR = 20,000 and closingRank = 10,000, margin = -10,000 (Ambitious).
 * 
 * Margin = closingRank - userAIR
 */

function calculateRankMargin(userAIR, closingRank) {
    if (userAIR === null || userAIR === undefined || closingRank === null || closingRank === undefined) {
        return null;
    }
    
    // Normalize strings with commas or non-numeric characters if any exist
    const normalize = (val) => {
        if (typeof val === 'string') {
            const stripped = val.replace(/[^0-9.-]+/g, "");
            if (stripped === "") return NaN;
            return Number(stripped);
        }
        if (val === "") return NaN;
        return Number(val);
    };

    const userRank = normalize(userAIR);
    const cutoffRank = normalize(closingRank);

    if (!Number.isFinite(userRank) || !Number.isFinite(cutoffRank)) {
        return null;
    }

    return cutoffRank - userRank;
}

export function assessFit(userAIR, analyzedCutoffs) {
    if (!analyzedCutoffs || !analyzedCutoffs.hasData || !userAIR) {
        return {
            classification: 'Insufficient historical data',
            rankMarginLatest: null,
            rankMarginBest: null,
            rankMarginWorst: null,
            score: -999999,
            explanation: "There is insufficient historical data available to assess your chances for this specific opportunity.",
            confidence: analyzedCutoffs ? analyzedCutoffs.confidence : 'Insufficient'
        };
    }

    const rankMarginLatest = calculateRankMargin(userAIR, analyzedCutoffs.latestClosingRank);
    const rankMarginBest = calculateRankMargin(userAIR, analyzedCutoffs.bestClosingRank);     
    const rankMarginWorst = calculateRankMargin(userAIR, analyzedCutoffs.worstClosingRank);   

    if (rankMarginLatest === null) {
        return {
            classification: 'Insufficient historical data',
            rankMarginLatest: null,
            rankMarginBest: null,
            rankMarginWorst: null,
            score: -999999,
            explanation: "Historical cutoff data is invalid or missing for this selection.",
            confidence: analyzedCutoffs.confidence
        };
    }

    // Classification Logic
    const buffer = Math.max(analyzedCutoffs.latestClosingRank * 0.10, 1000);
    
    let classification = 'Historically difficult';
    let score = rankMarginLatest; 

    if (rankMarginLatest >= buffer) {
        classification = 'Historically favorable';
    } else if (rankMarginLatest >= 0 || (rankMarginWorst !== null && rankMarginWorst >= 0)) {
        classification = 'Historically competitive';
    } else {
        classification = 'Historically difficult';
    }

    // Generate Explanation
    const userRankNum = Number(String(userAIR).replace(/[^0-9.-]+/g, ""));
    let explanation = `Your AIR is ${userRankNum.toLocaleString()}. `;
    
    const margin = Math.abs(rankMarginLatest).toLocaleString();
    const lYear = analyzedCutoffs.latestYear;
    const lRound = analyzedCutoffs.latestRound;
    const lCutoff = Number(analyzedCutoffs.latestClosingRank).toLocaleString();

    if (rankMarginLatest >= 0) {
        explanation += `The ${lYear} Round ${lRound} closing rank was ${lCutoff}, meaning your rank is better than the historical cutoff by ${margin} spots. `;
    } else {
        explanation += `The ${lYear} Round ${lRound} closing rank was ${lCutoff}, meaning your rank is worse than the historical cutoff by ${margin} spots. `;
    }

    if (analyzedCutoffs.yoyMovement !== null) {
        const yoyDir = analyzedCutoffs.yoyMovement >= 0 ? "became less competitive" : "became more competitive";
        explanation += `Year-over-year, the closing rank ${yoyDir} by ${Math.abs(analyzedCutoffs.yoyMovement).toLocaleString()} spots. `;
    }

    explanation += `Confidence in this assessment is ${analyzedCutoffs.confidence} based on ${analyzedCutoffs.historicalRoundsAvailable} historical observations.`;

    return {
        classification,
        rankMarginLatest,
        rankMarginBest,
        rankMarginWorst,
        score,
        explanation,
        confidence: analyzedCutoffs.confidence
    };
}
