/**
 * Core business logic for hard filtering candidate options.
 */

export function filterOption(option, criteria) {
    // 1. Budget (Max Fee)
    if (criteria.budget) {
        // If feeAmount is null, we can't definitively exclude it, so we strictly retain it.
        // User rule: "Do not apply a filter if the user has not supplied it." (Handled by checking criteria.budget)
        if (option.financials.feeAmount !== null && option.financials.feeAmount > criteria.budget) {
            return false; // Exceeds budget
        }
    }

    // 2. Stipend (Min Stipend)
    if (criteria.stipend) {
        if (option.financials.stipendYear1 !== null && option.financials.stipendYear1 < criteria.stipend) {
            return false; // Does not meet minimum stipend
        }
    }

    // 3. Bond constraints
    if (criteria.bond) {
        // 'no_bond', 'max_1yr', 'max_2yr', 'max_penalty_10L', etc.
        const bondYears = option.financials.bondYears;
        const bondPenalty = option.financials.bondPenalty;

        if (criteria.bond === 'no_bond') {
            if (bondYears !== null && bondYears > 0) return false;
        } 
        else if (criteria.bond.startsWith('max_yrs_')) {
            const maxYrs = parseInt(criteria.bond.split('_')[2], 10);
            if (bondYears !== null && bondYears > maxYrs) return false;
        }
        else if (criteria.bond.startsWith('max_pen_')) {
            const maxPen = parseInt(criteria.bond.split('_')[2], 10);
            if (bondPenalty !== null && bondPenalty > maxPen) return false;
        }
    }

    // 4. Seats
    if (criteria.seats) {
        const minSeats = parseInt(criteria.seats, 10);
        // If seat data is unavailable, we can't definitively say they don't have seats,
        // but typically a user searching for 'min seats' wants options that are CONFIRMED
        // to have that many seats. The zero-inference policy demands we don't guess.
        // We will exclude if availableSeats < minSeats.
        if (option.seatData) {
            if (option.seatData.status !== 'AVAILABLE') {
                return false; // Not officially published, so we don't show it when strictly filtering by seats
            }
            if (option.seatData.categorySeats < minSeats) {
                return false;
            }
        }
    }

    // Note: Domicile is skipped as requested because datasets aren't connected yet.
    // Note: Category, Branch, College are handled BEFORE this step via O(1) SearchIndex intersections.

    return true; // Passed all hard filters
}
