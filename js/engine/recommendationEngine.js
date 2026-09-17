export function generateRecommendations(optionsWithState, userPreferences = {}) {
    // optionsWithState is an array of { state: { id, tag, notes, isFavorite }, data: optionData }
    
    // Tier Definitions mapping to sort weights
    const TIER_WEIGHTS = {
        'Dream': 30000,
        'Target': 20000,
        'Safe': 10000,
        'None': 0
    };
    
    const recommendations = optionsWithState.map(item => {
        const { state, data } = item;
        
        // 1. Determine Effective Tier
        // If user explicitly tagged it, use that. Otherwise fallback to historical fit mapping.
        let effectiveTier = state.tag;
        if (effectiveTier === 'None') {
            if (data._fit && data._fit.classification === 'Historically difficult') effectiveTier = 'Dream';
            else if (data._fit && data._fit.classification === 'Historically competitive') effectiveTier = 'Target';
            else if (data._fit && data._fit.classification === 'Historically favorable') effectiveTier = 'Safe';
        }
        
        const tierScore = TIER_WEIGHTS[effectiveTier] || 0;
        
        // 2. Calculate Secondary Weights within the tier
        let internalScore = 0;
        const reasons = [];
        
        // A. Rank Margin (Ambitiousness within tier)
        // For Dream/Target choices, a harder rank margin (more negative) is often more desirable if the user prefers it, 
        // but to ensure we sort intelligently, we'll give a slight bump to choices closer to their rank to maximize chances, 
        // OR wait - if it's a Dream, they might want the absolute best (hardest to get) at the top of the Dream tier.
        // Let's use rank margin as a tie-breaker. Lower closing rank = higher prestige/internal score.
        if (data._fit && data._fit.rankMarginLatest !== null) {
            // A more negative margin means the closing rank was much lower (better/harder to get)
            // So we subtract the margin from the score to push harder colleges up within the tier.
            internalScore -= data._fit.rankMarginLatest; 
        }
        
        // B. Budget Compatibility
        if (data.financials && data.financials.feeRaw) {
            const feeRaw = data.financials.feeRaw.toLowerCase().replace(/[^0-9]/g, '');
            const fee = parseInt(feeRaw, 10);
            if (!isNaN(fee)) {
                if (userPreferences.maxFee && fee <= userPreferences.maxFee) {
                    internalScore += 500;
                    reasons.push("Within your stated budget constraint");
                }
                // Penalize extremely high fees
                if (fee > 2000000) {
                    internalScore -= 1000;
                }
            }
        }
        
        // C. Stipend Attractiveness
        if (data.financials && data.financials.stipendYear1) {
            internalScore += (data.financials.stipendYear1 / 1000); // 1 point per 1k stipend
            if (userPreferences.minStipend && data.financials.stipendYear1 >= userPreferences.minStipend) {
                internalScore += 500;
                reasons.push("Meets or exceeds your stipend requirement");
            }
        }
        
        // D. Bond Attractiveness
        if (data.financials && data.financials.bondYears !== undefined) {
            if (data.financials.bondYears === 0) {
                internalScore += 800;
                reasons.push("Highly attractive: No service bond");
            } else if (data.financials.bondYears > 2) {
                internalScore -= 500; // Penalize long bonds
            }
        }
        
        // E. Favorites
        if (state.isFavorite) {
            internalScore += 2000;
            reasons.push("Marked as a personal favorite");
        }
        
        // F. Data Confidence
        if (data._fit && data._fit.confidence === 'High') {
            internalScore += 100;
        } else if (data._fit && data._fit.confidence === 'Low') {
            internalScore -= 200;
            reasons.push("Warning: Historical data confidence is low");
        }
        
        // Add tier reasoning
        if (effectiveTier === 'Dream') {
            reasons.unshift("Dream Tier: Highly ambitious based on historical cutoffs or your manual tag.");
        } else if (effectiveTier === 'Target') {
            reasons.unshift("Target Tier: Competitive but attainable based on historical trends or your manual tag.");
        } else if (effectiveTier === 'Safe') {
            reasons.unshift("Safe Tier: High historical probability of securing this seat or your manual tag.");
        }
        
        const finalScore = tierScore + internalScore;
        
        return {
            optionId: data.id,
            tier: effectiveTier,
            tierScore: tierScore,
            internalScore: internalScore,
            recommendationScore: finalScore,
            reasons: reasons,
            dataConfidence: data._fit ? data._fit.confidence : 'Unknown'
        };
    });
    
    // Sort descending by final score
    return recommendations.sort((a, b) => b.recommendationScore - a.recommendationScore);
}
