export class SearchIndex {
    constructor(indexesData) {
        this.indexes = indexesData;
    }

    // Pass in criteria like { categoryId: 1, courseId: 14 }
    // Returns an array of optionIds that match ALL criteria
    search(criteria) {
        let currentSet = null;
        
        const applyIntersection = (indexMap, val) => {
            if (!val) return;
            const ids = indexMap[val] || [];
            if (currentSet === null) {
                currentSet = new Set(ids);
            } else {
                const newSet = new Set();
                for (let i = 0; i < ids.length; i++) {
                    if (currentSet.has(ids[i])) {
                        newSet.add(ids[i]);
                    }
                }
                currentSet = newSet;
            }
        };

        const applyIntersectionMultiple = (indexMap, valArray) => {
            if (!valArray || valArray.length === 0) return;
            const unionIds = new Set();
            for (let i = 0; i < valArray.length; i++) {
                const ids = indexMap[valArray[i]] || [];
                for (let j = 0; j < ids.length; j++) {
                    unionIds.add(ids[j]);
                }
            }
            if (currentSet === null) {
                currentSet = unionIds;
            } else {
                const newSet = new Set();
                for (const id of unionIds) {
                    if (currentSet.has(id)) {
                        newSet.add(id);
                    }
                }
                currentSet = newSet;
            }
        };

        if (criteria.instituteIds && criteria.instituteIds.length > 0) applyIntersectionMultiple(this.indexes.byInstitute, criteria.instituteIds);
        if (criteria.courseIds && criteria.courseIds.length > 0) applyIntersectionMultiple(this.indexes.byCourse, criteria.courseIds);
        if (criteria.categoryIds && criteria.categoryIds.length > 0) applyIntersectionMultiple(this.indexes.byCategory, criteria.categoryIds);
        if (criteria.quotaIds && criteria.quotaIds.length > 0) applyIntersectionMultiple(this.indexes.byQuota, criteria.quotaIds);
        if (criteria.states && criteria.states.length > 0) applyIntersectionMultiple(this.indexes.byState, criteria.states);
        
        // If no criteria provided, we technically match all, but returning 21k IDs is heavy.
        // The worker should handle this gracefully.
        return currentSet ? Array.from(currentSet) : [];
    }
}
