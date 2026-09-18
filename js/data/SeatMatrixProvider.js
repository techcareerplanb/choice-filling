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
            // Composite key for O(1) lookup, ignoring round
            const key = `${record.instituteId}_${record.courseId}_${record.quotaId}_${record.year}`;
            this.dataIndex.set(key, record);
        }
        
        this.isInitialized = true;
    }

    /**
     * Retrieves seat matrix data for a specific option.
     */
    static getSeats({ instituteId, courseId, quotaId, categoryId, year }) {
        if (!this.isInitialized) {
            return {
                status: 'UNAVAILABLE',
                availableSeats: null,
                notes: 'Seat matrix data not initialized.'
            };
        }

        const key = `${instituteId}_${courseId}_${quotaId}_${year}`;
        const record = this.dataIndex.get(key);

        if (!record) {
            return {
                status: 'UNAVAILABLE',
                totalSeats: null,
                categorySeats: null,
                sourceType: null,
                source: null,
                notes: `Data Unavailable: Seat matrix not officially published for this specific institute, course, and quota for ${year}.`
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
            sourceType: record.sourceType || 'AIQ',
            source: 'MCC',
            instituteCode: record.instituteCode,
            notes: null
        };
    }
}
