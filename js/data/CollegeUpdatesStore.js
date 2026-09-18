const STORAGE_KEY = 'college-data-updates-v1';

export class CollegeUpdatesStore {
    /**
     * Use exactly one stable key-generation function.
     */
    static generateKey(instituteId, courseId = null) {
        return courseId == null || courseId === '' || courseId === 'null'
            ? `inst_${instituteId}_global`
            : `inst_${instituteId}_course_${courseId}`;
    }

    /**
     * Get all raw updates.
     */
    static getAll() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            console.error('Failed to parse college updates from local storage', e);
            return {};
        }
    }

    /**
     * Get a specific raw update record.
     */
    static getUpdate(instituteId, courseId = null) {
        const store = this.getAll();
        const key = this.generateKey(instituteId, courseId);
        return store[key] || null;
    }

    /**
     * Get a merged update for a specific course.
     * Overlays course-specific record fields onto college-wide record fields.
     */
    static getMergedUpdate(instituteId, courseId) {
        const globalUpdate = this.getUpdate(instituteId, null);
        const courseUpdate = courseId ? this.getUpdate(instituteId, courseId) : null;

        if (!globalUpdate && !courseUpdate) return null;
        if (!courseUpdate) return JSON.parse(JSON.stringify(globalUpdate));
        if (!globalUpdate) return JSON.parse(JSON.stringify(courseUpdate));

        // Merge logic at individual-field level
        const merged = JSON.parse(JSON.stringify(globalUpdate));
        
        if (courseUpdate.fees) {
            merged.fees = { ...merged.fees };
            if (courseUpdate.fees.annualTuition !== null) merged.fees.annualTuition = courseUpdate.fees.annualTuition;
            if (courseUpdate.fees.totalCourse !== null) merged.fees.totalCourse = courseUpdate.fees.totalCourse;
            if (courseUpdate.fees.hostel !== null) merged.fees.hostel = courseUpdate.fees.hostel;
            if (courseUpdate.fees.otherMandatory !== null) merged.fees.otherMandatory = courseUpdate.fees.otherMandatory;
        }

        if (courseUpdate.stipend && courseUpdate.stipend.monthly !== null) {
            merged.stipend = { ...merged.stipend, monthly: courseUpdate.stipend.monthly };
        }

        if (courseUpdate.bond) {
            merged.bond = { ...merged.bond };
            if (courseUpdate.bond.required !== 'UNKNOWN' && courseUpdate.bond.required !== null) merged.bond.required = courseUpdate.bond.required;
            if (courseUpdate.bond.durationMonths !== null) merged.bond.durationMonths = courseUpdate.bond.durationMonths;
            if (courseUpdate.bond.penaltyAmount !== null) merged.bond.penaltyAmount = courseUpdate.bond.penaltyAmount;
            if (courseUpdate.bond.details !== null) merged.bond.details = courseUpdate.bond.details;
        }

        if (courseUpdate.courseDurationMonths !== null) merged.courseDurationMonths = courseUpdate.courseDurationMonths;
        if (courseUpdate.remarks !== null && courseUpdate.remarks !== "") merged.remarks = courseUpdate.remarks;
        
        if (courseUpdate.source && (courseUpdate.source.label || courseUpdate.source.url)) {
            merged.source = { ...courseUpdate.source };
        }

        // Take the latest updated timestamp between the two
        merged.lastUpdatedAt = new Date(Math.max(
            new Date(globalUpdate.lastUpdatedAt || 0), 
            new Date(courseUpdate.lastUpdatedAt || 0)
        )).toISOString();

        return merged;
    }

    /**
     * Save a specific update record.
     */
    static saveUpdate(instituteId, courseId, updateObj) {
        const store = this.getAll();
        const key = this.generateKey(instituteId, courseId);
        
        store[key] = {
            ...updateObj,
            instituteId,
            courseId: courseId == null || courseId === '' || courseId === 'null' ? null : courseId,
            lastUpdatedAt: new Date().toISOString()
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    }

    /**
     * Remove a single update record.
     */
    static deleteUpdate(instituteId, courseId = null) {
        const store = this.getAll();
        const key = this.generateKey(instituteId, courseId);
        if (store[key]) {
            delete store[key];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
        }
    }

    /**
     * Clear all updates.
     */
    static clearAll() {
        localStorage.removeItem(STORAGE_KEY);
    }

    /**
     * Validate an imported JSON store.
     */
    static validateImport(data) {
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            throw new Error('Import data must be a valid JSON object map.');
        }

        for (const [key, record] of Object.entries(data)) {
            if (!record.instituteId) {
                throw new Error(`Record ${key} is missing instituteId.`);
            }
            if (record.fees && typeof record.fees !== 'object') throw new Error(`Invalid fees object in ${key}`);
            if (record.stipend && typeof record.stipend !== 'object') throw new Error(`Invalid stipend object in ${key}`);
            if (record.bond && typeof record.bond !== 'object') throw new Error(`Invalid bond object in ${key}`);
        }
    }

    /**
     * Import a JSON string blob into the store.
     * @param {string} jsonString 
     * @param {boolean} merge If true, overlays onto existing. If false, completely replaces local.
     */
    static importUpdates(jsonString, merge = true) {
        let importedData;
        try {
            importedData = JSON.parse(jsonString);
        } catch (e) {
            throw new Error('Failed to parse JSON file.');
        }

        this.validateImport(importedData);

        if (merge) {
            const store = this.getAll();
            const merged = { ...store, ...importedData };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        } else {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(importedData));
        }
    }

    /**
     * Export all updates to a JSON string.
     */
    static exportUpdates() {
        const store = this.getAll();
        return JSON.stringify(store, null, 2);
    }
}
