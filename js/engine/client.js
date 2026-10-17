import { getCacheItem, setCacheItem, enforceLRU } from './cache.js';


function getApiPrefix() {
    const c = localStorage.getItem('activeCounselling') || 'All-India';
    return `/api/${c}`;
}

export class EngineClient {
    constructor() {
        // No longer uses WebWorker
    }
    
    async init(progressCallback) {
        if (progressCallback) progressCallback('Connecting to server...');
        
        const cachedMeta = await getCacheItem('filterMetadata', getApiPrefix());
        if (cachedMeta) {
            return cachedMeta;
        }

        const res = await fetch(getApiPrefix() + '/api/filter-metadata'.replace('/api', ''));
        if (!res.ok) throw new Error('Failed to load filter metadata');
        const data = await res.json();
        
        await setCacheItem('filterMetadata', getApiPrefix(), data);
        return data;
    }
    
    async search(ranks, criteria, cursor = null, sortBy = 'fit', forceRefresh = false) {
        ranks = ranks || {};
        const rank = ranks.rank;
        const aiRank = ranks.aiRank;
        const params = new URLSearchParams();
        if (rank) params.append('rank', rank);
        if (aiRank) params.append('aiRank', aiRank);
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
        if (criteria.includeInservice !== undefined && criteria.includeInservice !== null) params.append('includeInservice', criteria.includeInservice);
        if (criteria.page) params.append('page', criteria.page);
        if (criteria.pageSize) params.append('pageSize', criteria.pageSize);
        
        // Sort keys to ensure deterministic cache key
        const sortedParams = Array.from(params.entries()).sort((a, b) => a[0].localeCompare(b[0]));
        const cacheKey = getApiPrefix() + '_' + JSON.stringify(sortedParams);
        
        if (!forceRefresh) {
            const cachedPage = await getCacheItem('resultPages', cacheKey);
            if (cachedPage) {
                cachedPage._fromCache = true;
                return cachedPage;
            }
        }
        
        const res = await fetch(`${getApiPrefix()}/options?${params.toString()}`);
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
        const cacheKey = getApiPrefix() + '_' + `${id}_${JSON.stringify(sortedParams)}`;
        
        const cachedDetail = await getCacheItem('optionDetails', cacheKey);
        if (cachedDetail) return cachedDetail;
        
        const res = await fetch(`${getApiPrefix()}/options/${id}?${params.toString()}`);
        if (!res.ok) throw new Error('Option not found');
        
        const data = await res.json();
        await setCacheItem('optionDetails', cacheKey, data);
        enforceLRU('optionDetails', 200); // Keep max 200 options
        
        return data;
    }
    
    async getIdentities(ranks, criteria, sortBy = 'fit') {
        const params = new URLSearchParams();
        if (typeof ranks === 'object' && ranks !== null) {
            if (ranks.rank) params.append('rank', ranks.rank);
            if (ranks.aiRank) params.append('aiRank', ranks.aiRank);
        } else if (ranks) {
            params.append('rank', ranks);
        }
        if (sortBy) params.append('sortBy', sortBy);
        
        if (criteria.quotas && criteria.quotas.length) params.append('quota', criteria.quotas.join(','));
        if (criteria.states && criteria.states.length) params.append('states', criteria.states.join(','));
        if (criteria.institutes && criteria.institutes.length) params.append('institutes', criteria.institutes.join(','));
        if (criteria.courses && criteria.courses.length) params.append('courses', criteria.courses.join(','));
        
        // Send raw candidate category ID — server handles eligibility expansion
        if (criteria.candidateCategory) params.append('candidateCategory', criteria.candidateCategory);
        if (criteria.budget) params.append('budget', criteria.budget);
        if (criteria.stipend) params.append('stipend', criteria.stipend);
        if (criteria.bond !== undefined && criteria.bond !== null) params.append('bond', criteria.bond);
        if (criteria.seats) params.append('seats', criteria.seats);
        if (criteria.year) params.append('year', criteria.year);
        if (criteria.round) params.append('round', criteria.round);
        if (criteria.includeInservice !== undefined) params.append('includeInservice', criteria.includeInservice);
        
        // Shortlist identities isn't heavily paginated, usually a one-off fetch. No IDB caching required.
        const res = await fetch(`${getApiPrefix()}/identities?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch identities');
        return await res.json();
    }

    async getOptionsBatch(ids) {
        if (!ids || ids.length === 0) return [];
        // We could theoretically cache individual IDs from batches, but for simplicity we rely on the network batch.
        const res = await fetch(`${getApiPrefix()}/options/batch?ids=${ids.join(',')}`);
        if (!res.ok) throw new Error('Failed to load batch options');
        return await res.json();
    }
}
