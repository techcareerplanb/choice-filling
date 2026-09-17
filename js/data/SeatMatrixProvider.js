export class SeatMatrixProvider {
    static dataIndex = new Map();
    static isInitialized = false;

    /**
     * Initializes the provider with seat matrix data
     * @param {Array} seatData - Array of parsed seat matrix records
     */
    static initialize(seatData) {
        if (!seatData || !Array.isArray(seatData)) return;
        
        for (const record of seatData) {
            // Composite key for O(1) lookup
            const key = `${record.instituteId}_${record.courseId}_${record.quotaId}_${record.year}_${record.round}`;
            this.dataIndex.set(key, record);
        }
        
        this.isInitialized = true;
    }

    /**
     * Retrieves seat matrix data for a specific option.
     * @param {Object} query
     * @param {number} query.instituteId
     * @param {number} query.courseId
     * @param {number} query.quotaId
     * @param {number} query.categoryId
     * @param {number} query.year
     * @param {number} query.round
     * @returns {Object} Seat matrix status and data
     */
    static getSeats({ instituteId, courseId, quotaId, categoryId, year, round }) {
        if (!this.isInitialized) {
            return {
                status: 'UNAVAILABLE',
                availableSeats: null,
                notes: 'Seat matrix data not initialized.'
            };
        }

        const key = `${instituteId}_${courseId}_${quotaId}_${year}_${round}`;
        const record = this.dataIndex.get(key);

        if (!record) {
            return {
                status: 'UNAVAILABLE',
                totalSeats: null,
                categorySeats: null,
                source: null,
                notes: `Data Unavailable: Seat matrix not officially published for this specific institute, course, and quota for Round ${round} ${year}.`
            };
        }

        let catSeats = 0;
        if (categoryId === null || categoryId === undefined) {
            catSeats = record.totalSeats; // Fallback to total seats if no category selected
        } else {
            catSeats = record.categorySeats[String(categoryId)] || 0;
        }

        return {
            status: 'AVAILABLE',
            totalSeats: record.totalSeats,
            categorySeats: catSeats,
            source: 'MCC',
            instituteCode: record.instituteCode,
            notes: null
        };
    }
}
