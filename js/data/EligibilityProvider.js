export class EligibilityProvider {
    /**
     * Retrieves domicile/category eligibility for a specific option given a user profile.
     * Currently returns UNAVAILABLE as official eligibility rules are not integrated.
     * @param {Object} params - { candidateDomicile, instituteId, courseId, quotaId, categoryId }
     * @returns {Object} Eligibility status and data
     */
    static checkDomicileEligibility(params) {
        return {
            status: 'UNAVAILABLE',
            eligible: null,
            notes: 'Official domicile eligibility rules are not yet integrated.'
        };
    }
}
