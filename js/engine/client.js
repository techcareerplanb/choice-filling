import { getCacheItem, setCacheItem, enforceLRU } from './cache.js';

export class EngineClient {
    constructor() {
        // No longer uses WebWorker
    }
    
    async init(progressCallback) {
        if (progressCallback) progressCallback('Connecting to server...');
        
        const cachedMeta = await getCacheItem('filterMetadata', 'meta');
        if (cachedMeta) {
            return cachedMeta;
        }

        const res = await fetch('/api/filter-metadata');
        if (!res.ok) throw new Error('Failed to load filter metadata');
        const data = await res.json();
        
        await setCacheItem('filterMetadata', 'meta', data);
        return data;
    }
    
    async search(rank, criteria, cursor = null, sortBy = 'fit', forceRefresh = false) {
        const params = new URLSearchParams();
        if (rank) params.append('rank', rank);
        if (cursor) params.append('cursor', cursor);
        if (sortBy) params.append('sortBy', sortBy);
        
        // Append all array/list criteria as comma separated strings
        if (criteria.quotas && criteria.quotas.length) params.append('quota', criteria.quotas.join(','));
        if (criteria.states && criteria.states.length) params.append('states', criteria.states.join(','));
        if (criteria.institutes && criteria.institutes.length) params.append('institutes', criteria.institutes.join(','));
        if (criteria.courses && criteria.courses.length) params.append('courses', criteria.courses.join(','));
        
        // Send the raw candidate category ID — the server resolves eligibility expansion (OPEN+reserved).
        // Do NOT expand client-side and do NOT gate on array length (that silently drops the filter for
        // non-GEN candidates who have a 2-element array).
        if (criteria.candidateCategory) params.append('candidateCategory', criteria.candidateCategory);
        if (criteria.budget) params.append('budget', criteria.budget);
        if (criteria.stipend) params.append('stipend', criteria.stipend);
        if (criteria.bond !== undefined && criteria.bond !== null) params.append('bond', criteria.bond);
        if (criteria.year) params.append('year', criteria.year);
        if (criteria.round) params.append('round', criteria.round);
        
        // Sort keys to ensure deterministic cache key
        const sortedParams = Array.from(params.entries()).sort((a, b) => a[0].localeCompare(b[0]));
        const cacheKey = JSON.stringify(sortedParams);
        
        if (!forceRefresh) {
            const cachedPage = await getCacheItem('resultPages', cacheKey);
            if (cachedPage) {
                cachedPage._fromCache = true;
                return cachedPage;
            }
        }
        
        const res = await fetch(`/api/options?${params.toString()}`);
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to search options');
        }
        
        const data = await res.json();
        data.cachedAt = new Date().toISOString();
        
        await setCacheItem('resultPages', cacheKey, data);
        enforceLRU('resultPages', 50); // Keep max 50 pages
        
        return data;
    }
    
    async getOption(id, rank = null, year = 'all', round = 'all') {
        const params = new URLSearchParams();
        if (rank) params.append('rank', rank);
        if (year !== 'all') params.append('year', year);
        if (round !== 'all') params.append('round', round);
        
        const sortedParams = Array.from(params.entries()).sort((a, b) => a[0].localeCompare(b[0]));
        const cacheKey = `${id}_${JSON.stringify(sortedParams)}`;
        
        const cachedDetail = await getCacheItem('optionDetails', cacheKey);
        if (cachedDetail) return cachedDetail;
        
        const res = await fetch(`/api/options/${id}?${params.toString()}`);
        if (!res.ok) throw new Error('Option not found');
        
        const data = await res.json();
        await setCacheItem('optionDetails', cacheKey, data);
        enforceLRU('optionDetails', 200); // Keep max 200 options
        
        return data;
    }
    
    async getIdentities(rank, criteria) {
        const params = new URLSearchParams();
        if (rank) params.append('rank', rank);
        
        if (criteria.quotas && criteria.quotas.length) params.append('quota', criteria.quotas.join(','));
        if (criteria.states && criteria.states.length) params.append('states', criteria.states.join(','));
        if (criteria.institutes && criteria.institutes.length) params.append('institutes', criteria.institutes.join(','));
        if (criteria.courses && criteria.courses.length) params.append('courses', criteria.courses.join(','));
        
        // Send raw candidate category ID — server handles eligibility expansion
        if (criteria.candidateCategory) params.append('candidateCategory', criteria.candidateCategory);
        if (criteria.budget) params.append('budget', criteria.budget);
        if (criteria.stipend) params.append('stipend', criteria.stipend);
        if (criteria.bond !== undefined && criteria.bond !== null) params.append('bond', criteria.bond);
        if (criteria.year) params.append('year', criteria.year);
        if (criteria.round) params.append('round', criteria.round);
        
        // Shortlist identities isn't heavily paginated, usually a one-off fetch. No IDB caching required.
        const res = await fetch(`/api/options/identities?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch identities');
        return await res.json();
    }

    async getOptionsBatch(ids) {
        if (!ids || ids.length === 0) return [];
        // We could theoretically cache individual IDs from batches, but for simplicity we rely on the network batch.
        const res = await fetch(`/api/options/batch?ids=${ids.join(',')}`);
        if (!res.ok) throw new Error('Failed to load batch options');
        return await res.json();
    }
}
