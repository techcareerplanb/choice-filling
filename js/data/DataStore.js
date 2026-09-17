export class DataStore {
    constructor(datasets) {
        // Map arrays to objects for O(1) lookup
        this.institutes = this._arrayToMap(datasets.institutes);
        this.courses = this._arrayToMap(datasets.courses);
        this.quotas = this._arrayToMap(datasets.quotas);
        this.categories = this._arrayToMap(datasets.categories);
        this.counsellings = this._arrayToMap(datasets.counsellings);
        
        // Options can be mapped by ID
        this.options = this._arrayToMap(datasets.options);
        
        // Group cutoffs by optionId
        this.cutoffsByOption = this._groupArrayBy(datasets.cutoffs, 'optionId');
        
        // Group financials by optionId (should be 1:1, but safety first)
        this.financialsByOption = this._arrayToMap(datasets.financials, 'optionId');
    }

    _arrayToMap(arr, keyField = 'id') {
        const map = {};
        for (let i = 0; i < arr.length; i++) {
            map[arr[i][keyField]] = arr[i];
        }
        return map;
    }

    _groupArrayBy(arr, keyField) {
        const map = {};
        for (let i = 0; i < arr.length; i++) {
            const val = arr[i];
            const key = val[keyField];
            if (!map[key]) map[key] = [];
            map[key].push(val);
        }
        return map;
    }

    getOption(optionId) {
        return this.options[optionId];
    }

    getHydratedOption(optionId) {
        const opt = this.options[optionId];
        if (!opt) return null;
        
        return {
            ...opt,
            institute: this.institutes[opt.instituteId],
            course: this.courses[opt.courseId],
            quota: this.quotas[opt.quotaId],
            category: this.categories[opt.categoryId],
            counselling: this.counsellings[opt.counsellingId],
            cutoffs: this.cutoffsByOption[optionId] || [],
            financials: this.financialsByOption[optionId] || null
        };
    }

    // Get metadata lists for dropdowns
    getMetadata() {
        const statesSet = new Set();
        Object.values(this.institutes).forEach(inst => {
            if (inst.state) statesSet.add(inst.state);
        });
        
        return {
            institutes: Object.values(this.institutes),
            courses: Object.values(this.courses),
            quotas: Object.values(this.quotas),
            categories: Object.values(this.categories),
            counsellings: Object.values(this.counsellings),
            states: Array.from(statesSet).sort()
        };
    }
}
