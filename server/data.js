import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DataStore } from '../js/data/DataStore.js';
import { SearchIndex } from '../js/data/SearchIndex.js';
import { filterOption } from '../js/engine/filterEngine.js';
import { analyzeCutoffs } from '../js/engine/cutoffEngine.js';
import { assessFit } from '../js/engine/fitEngine.js';
import { SeatMatrixProvider } from '../js/data/SeatMatrixProvider.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data', 'processed');

export const dataStores = {};
export const searchIndexes = {};

function getEligibleCategories(candidateCategoryId) {
    if (!candidateCategoryId) return null;
    return [String(candidateCategoryId)];
}


export async function initDataLayer() {
    console.log("Loading datasets into memory...");
    const files = [
        'metadata', 'institutes', 'courses', 'categories', 'quotas', 'counsellings',
        'options', 'cutoffs', 'financials',
        'seat-matrix-2025', 'seat-matrix-additional-2025', 'indexes'
    ];
    
    const dirs = await fs.promises.readdir(DATA_DIR, { withFileTypes: true });
    let seatMatrices = [];
    
    for (const dir of dirs) {
        if (!dir.isDirectory()) continue;
        const counselling = dir.name;
        if (counselling.includes('mcc_pg')) continue;

        const datasets = {};
        for (const file of files) {
            const filePath = path.join(DATA_DIR, counselling, `${file}.json`);
            if (fs.existsSync(filePath)) {
                try {
                    const raw = await fs.promises.readFile(filePath, 'utf8');
                    datasets[file] = JSON.parse(raw);
                } catch(e) { datasets[file] = []; }
            } else {
                datasets[file] = [];
            }
        }
        
        dataStores[counselling] = new DataStore(datasets);
        searchIndexes[counselling] = new SearchIndex(datasets.indexes || {});
        seatMatrices = seatMatrices.concat(datasets['seat-matrix-2025'] || [], datasets['seat-matrix-additional-2025'] || []);
    }
    
    SeatMatrixProvider.initialize(seatMatrices);
    console.log("Data layer initialized for: " + Object.keys(dataStores).join(', '));
}

function getFilteredAndSortedResults(counselling, query) {
    const dataStore = dataStores[counselling];
    const searchIndex = searchIndexes[counselling];

    if (!dataStore || !searchIndex) throw new Error("Data layer not initialized for " + counselling);
    
    // Parse filters
    const rank = query.rank ? parseInt(query.rank, 10) : null;
    const aiRank = query.aiRank ? parseInt(query.aiRank, 10) : null;
    const quotas = query.quota ? query.quota.split(',') : [];
    const candidateCategory = query.candidateCategory || null;
    const states = query.states ? query.states.split(',') : [];
    const institutes = query.institutes ? query.institutes.split(',').map(Number) : [];
    const courses = query.courses ? query.courses.split(',').map(Number) : [];
    
    const eligibleCategoryIds = getEligibleCategories(candidateCategory);
    const quotaIds = quotas.map(q => {
        const qt = Object.values(dataStore.quotas).find(x => String(x.id) === q || x.short_name === q || x.name === q);
        return qt ? qt.id : null;
    }).filter(Boolean);
    
    const indexCriteria = {
        categoryIds: eligibleCategoryIds ? eligibleCategoryIds.map(Number) : undefined,
        quotaIds: quotaIds.length > 0 ? quotaIds : undefined,
        states: states.length > 0 ? states : undefined,
        instituteIds: institutes.length > 0 ? institutes : undefined,
        courseIds: courses.length > 0 ? courses : undefined
    };
    
    // Clear undefined
    Object.keys(indexCriteria).forEach(k => indexCriteria[k] === undefined && delete indexCriteria[k]);
    
    let candidateIds = searchIndex.search(indexCriteria);
    if (candidateIds.length === 0 && Object.keys(indexCriteria).length === 0) {
        candidateIds = Object.keys(dataStore.options);
    }
    
    // Additional criteria for filterEngine
    const extraCriteria = {
        budget: query.budget,
        stipend: query.stipend,
        bond: query.bond,
        seats: query.seats,
        year: query.year,
        round: query.round,
        includeInservice: query.includeInservice
    };
    
    const results = [];
    
    for (let i = 0; i < candidateIds.length; i++) {
        const optId = candidateIds[i];
        const hydrated = dataStore.getHydratedOption(optId);
        
        // Inject seat data
        hydrated.seatData = SeatMatrixProvider.getSeats({
            instituteId: hydrated.institute.id,
            courseId: hydrated.course.id,
            quotaId: hydrated.quota.id,
            categoryId: hydrated.category.id,
            year: 2025 // Current year
        });
        
        if (!filterOption(hydrated, extraCriteria)) {
            continue;
        }
        
        let filteredCutoffs = hydrated.cutoffs;
        // Always run cutoff filter to exclude in-service by default unless requested
        filteredCutoffs = hydrated.cutoffs.filter(c => {
            const yMatch = !extraCriteria.year || extraCriteria.year === 'all' || c.year === parseInt(extraCriteria.year, 10);
            const rMatch = !extraCriteria.round || extraCriteria.round === 'all' || c.round === Number(extraCriteria.round);
            const isService = c.candidateFlag === 'inservice_candidate' || c.inserviceCandidate === true;
            const inserviceMatch = extraCriteria.includeInservice === 'true' || !isService;
            return yMatch && rMatch && inserviceMatch;
        });
        
        if (filteredCutoffs.length === 0 && hydrated.cutoffs.length > 0) {
            continue;
        }
        
        const analyzed = analyzeCutoffs(filteredCutoffs);
        hydrated.cutoffs = filteredCutoffs;
        hydrated._analyzedCutoffs = analyzed;
        hydrated._fit = assessFit(rank, aiRank, analyzed);
        
        results.push(hydrated);
    }
    
    // Sort
    let rawSortBy = query.sortBy || 'fit';
    let isReverse = false;
    if (rawSortBy.endsWith('_rev')) {
        isReverse = true;
        rawSortBy = rawSortBy.replace('_rev', '');
    }
    const sortBy = rawSortBy;
    
    // Calculate a primary sort value for cursor
    results.forEach(r => {
        if (sortBy === 'fit') {
            const map = { 'Historically favorable': 3, 'Historically competitive': 2, 'Historically difficult': 1, 'Unknown': 0 };
            r._sortVal = map[r._fit.classification];
            r._sortTie = r._fit.rankMarginLatest !== null ? r._fit.rankMarginLatest : -Infinity;
        } else if (sortBy === 'rank') {
            const margin = r._fit ? (r._fit.rankMarginWorst !== null ? r._fit.rankMarginWorst : r._fit.rankMarginLatest) : null;
            if (margin !== null && margin !== undefined) {
                if (margin >= 0) {
                    // Group 0: positive differences (+0 to +N closest to rank first)
                    r._sortVal = margin;
                } else {
                    // Group 1: negative differences (-0 to -N closest to rank first)
                    r._sortVal = 1e9 + Math.abs(margin);
                }
            } else {
                r._sortVal = Infinity;
            }
        } else if (sortBy === 'fee') {
            r._sortVal = parseInt((r.financials.feeRaw || '').replace(/[^0-9]/g, '')) || Infinity;
        } else if (sortBy === 'stipend') {
            r._sortVal = r.financials.stipendYear1 || 0;
        } else if (sortBy === 'bond') {
            r._sortVal = r.financials.bondYears === undefined ? Infinity : r.financials.bondYears;
        } else if (sortBy === 'name') {
            r._sortVal = r.institute.name;
        } else if (sortBy === 'course') {
            r._sortVal = r.course.name;
        }
    });
    
    results.sort((a, b) => {
        let res = 0;
        if (sortBy === 'fit') {
            if (a._sortVal !== b._sortVal) res = b._sortVal - a._sortVal;
            else res = b._sortTie - a._sortTie;
        } else if (sortBy === 'stipend') {
            if (a._sortVal !== b._sortVal) res = b._sortVal - a._sortVal;
        } else if (sortBy === 'name' || sortBy === 'course') {
            const cmp = a._sortVal.localeCompare(b._sortVal);
            if (cmp !== 0) res = cmp;
        } else {
            // fee, bond, rank (ascending by default)
            if (a._sortVal !== b._sortVal) res = a._sortVal - b._sortVal;
        }
        
        if (res !== 0) {
            return isReverse ? -res : res;
        }
        return a.id - b.id; // stable fallback
    });

    return results;
}

export function searchOptions(counselling, query) {
    const results = getFilteredAndSortedResults(counselling, query);
    
    // Parse pagination and cursor
    const pageSize = Math.min(parseInt(query.pageSize, 10) || 50, 100);
    const cursor = query.cursor; 

    
    // Cursor / Page Pagination
    let startIndex = 0;
    if (query.page) {
        startIndex = (Math.max(1, parseInt(query.page, 10)) - 1) * pageSize;
    } else if (cursor) {
        const cursorPayload = Buffer.from(cursor, 'base64').toString('ascii');
        // format: sortVal_optionId (sortVal might be string or number)
        const parts = cursorPayload.split('_');
        const cId = parseInt(parts.pop(), 10);
        // We actually just find the index of this ID since results are fully sorted in memory.
        const idx = results.findIndex(r => r.id === cId);
        if (idx !== -1) {
            startIndex = idx + 1;
        } else {
            throw new Error('INVALID_CURSOR');
        }
    }
    
    const paginated = results.slice(startIndex, startIndex + pageSize);
    let nextCursor = null;
    if (startIndex + pageSize < results.length) {
        const lastItem = paginated[paginated.length - 1];
        nextCursor = Buffer.from(`cursor_${lastItem.id}`).toString('base64');
    }
    
    // Build compact DTOs to save bandwidth
    const items = paginated.map(p => ({
        id: p.id,
        institute: { id: p.institute.id, name: p.institute.name, state: p.institute.state },
        course: { id: p.course.id, name: p.course.name },
        quota: { id: p.quota.id, name: p.quota.name, short_name: p.quota.short_name },
        category: { id: p.category.id, name: p.category.name },
        financials: p.financials,
        seatData: p.seatData,
        cutoffs: p.cutoffs, // Kept to allow client sorting/inspection if needed (can be minimized)
        _analyzedCutoffs: p._analyzedCutoffs,
        _fit: p._fit
    }));
    
    return {
        items,
        pagination: {
            pageSize,
            nextCursor,
            hasMore: nextCursor !== null,
            totalMatching: results.length
        },
        appliedFilters: query
    };
}

export function getOption(counselling, id, reqYear, reqRound, rank, includeInservice = false) {
    const dataStore = dataStores[counselling];
    const searchIndex = searchIndexes[counselling];
    if (!dataStore || !searchIndex) throw new Error("Data layer not initialized for " + counselling);
    const opt = dataStore.getHydratedOption(id);
    if (!opt) return null;
    
    // Sibling Options (Same Institute, Quota, Category)
    const siblingIds = searchIndex.search({
        instituteId: opt.institute.id,
        quotaId: opt.quota.id,
        categoryId: opt.category.id
    });
    opt._siblings = siblingIds.map(sid => {
        const siblingOpt = dataStore.getHydratedOption(sid);
        return {
            optionId: siblingOpt.id,
            courseId: siblingOpt.course.id,
            courseName: siblingOpt.course.name
        };
    }).sort((a,b) => a.courseName.localeCompare(b.courseName));

    // Cutoff filtering
    let optCutoffs = opt.cutoffs;
    if (reqYear && reqYear !== 'all') optCutoffs = optCutoffs.filter(c => c.year === parseInt(reqYear, 10));
    if (reqRound && reqRound !== 'all') optCutoffs = optCutoffs.filter(c => c.round === Number(reqRound));
    
    optCutoffs = optCutoffs.filter(c => {
        const isService = c.candidateFlag === 'inservice_candidate' || c.inserviceCandidate === true;
        return String(includeInservice) === 'true' || !isService;
    });

    const analyzedStats = analyzeCutoffs(optCutoffs);
    opt.cutoffs = optCutoffs;
    opt._analyzedCutoffs = analyzedStats;
    if (rank) {
        opt._fit = assessFit(parseInt(rank, 10), analyzedStats);
    } else {
        opt._fit = { classification: 'Unknown', explanation: 'No AIR provided.', confidence: analyzedStats.confidence };
    }
    
    // Inject seat matrix
    opt.seatData = SeatMatrixProvider.getSeats({
        instituteId: opt.institute.id,
        courseId: opt.course.id,
        quotaId: opt.quota.id,
        categoryId: opt.category.id,
        year: 2025
    });

    return opt;
}

export function getOptionsBatch(counselling, ids) {
    const dataStore = dataStores[counselling];
    if (!dataStore) throw new Error("Data layer not initialized for " + counselling);
    return ids.map(id => {
        const opt = dataStore.getHydratedOption(id);
        if (!opt) return { id, error: 'NOT_FOUND' };
        
        opt._analyzedCutoffs = analyzeCutoffs(opt.cutoffs);
        return opt;
    });
}

export function getFilterMetadata(counselling) {
    const dataStore = dataStores[counselling];

    if (!dataStore) throw new Error("Data layer not initialized");
    return dataStore.getMetadata();
}


export function getFilteredIdentities(counselling, query) {
    const results = getFilteredAndSortedResults(counselling, query);
    const finalIdentities = [];
    const seenIdentities = new Set();
    
    for (let i = 0; i < results.length; i++) {
        const r = results[i];
        const identity = `${r.institute.id}_${r.course.id}`;
        if (!seenIdentities.has(identity)) {
            seenIdentities.add(identity);
            finalIdentities.push({ id: r.id, identity });
        }
    }
    
    return finalIdentities;
}
