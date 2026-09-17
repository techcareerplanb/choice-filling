import { DataLoader } from '../data/DataLoader.js';
import { DataStore } from '../data/DataStore.js';
import { SearchIndex } from '../data/SearchIndex.js';
import { filterOption } from '../engine/filterEngine.js';
import { analyzeCutoffs } from '../engine/cutoffEngine.js';
import { assessFit } from '../engine/fitEngine.js';
import { SeatMatrixProvider } from '../data/SeatMatrixProvider.js';
import { EligibilityProvider } from '../data/EligibilityProvider.js';

let dataStore = null;
let searchIndex = null;
let dataLoader = null;

self.onmessage = async (e) => {
    const { type, payload, msgId } = e.data;
    
    try {
        switch (type) {
            case 'INIT':
                dataLoader = new DataLoader();
                const datasets = await dataLoader.loadAll((progressMsg) => {
                    self.postMessage({ type: 'PROGRESS', payload: progressMsg });
                });
                
                self.postMessage({ type: 'PROGRESS', payload: 'Building indexes...' });
                dataStore = new DataStore(datasets);
                searchIndex = new SearchIndex(datasets.indexes);
                
                // Initialize Providers
                SeatMatrixProvider.initialize(datasets['seat-matrix-2025']);
                
                self.postMessage({ type: 'INIT_SUCCESS', msgId, payload: dataStore.getMetadata() });
                break;
                
            case 'SEARCH':
                if (!dataStore || !searchIndex) throw new Error('Data not initialized');
                
                const { rank, criteria } = payload;
                
                // 1. Initial O(1) Intersections (Category, Course, Institute, Quota)
                const indexCriteria = {
                    categoryId: criteria.categoryId,
                    courseIds: criteria.courses,
                    instituteIds: criteria.institutes,
                    quotaId: criteria.quotaId,
                    states: criteria.states
                };
                
                // Clear out undefined/null keys
                Object.keys(indexCriteria).forEach(k => indexCriteria[k] == null && delete indexCriteria[k]);
                
                let candidateIds = searchIndex.search(indexCriteria);
                
                if (candidateIds.length === 0 && Object.keys(indexCriteria).length === 0) {
                    candidateIds = Object.keys(dataStore.options);
                }
                
                // 2. Hydrate, Filter, Analyze, and Assess
                const results = [];
                
                // Dynamic imports are safe in modern web workers with type="module"
                // But we can just statically import them at the top of the file.
                // Let's assume they are imported. Wait, I didn't add the imports to the top.
                // I will add the imports now by replacing the top of the file as well in a separate block.
                
                for (let i = 0; i < candidateIds.length; i++) {
                    const optId = candidateIds[i];
                    const hydrated = dataStore.getHydratedOption(optId);
                    
                    // Inject Seat Matrix Data for filtering
                    hydrated.seatData = SeatMatrixProvider.getSeats({
                        instituteId: hydrated.institute.id,
                        courseId: hydrated.course.id,
                        quotaId: hydrated.quota.id,
                        categoryId: hydrated.category.id,
                        year: new Date().getFullYear(),
                        round: 1
                    });
                    
                    // A. Hard Filter (Budget, Stipend, Bond, Seats)
                    if (!filterOption(hydrated, criteria)) {
                        continue;
                    }
                    
                    // B. Analyze Cutoffs
                    let filteredCutoffs = hydrated.cutoffs;
                    if (criteria.year || criteria.round) {
                        filteredCutoffs = hydrated.cutoffs.filter(c => {
                            const yearMatch = !criteria.year || c.year === criteria.year;
                            const roundMatch = !criteria.round || c.round === criteria.round;
                            return yearMatch && roundMatch;
                        });
                    }
                    const analyzed = analyzeCutoffs(filteredCutoffs);
                    hydrated._analyzedCutoffs = analyzed;
                    
                    // C. Assess Fit
                    const fit = assessFit(rank, analyzed);
                    
                    hydrated._fit = fit;
                    
                    // Keep if user didn't provide rank, or if we have a valid classification
                    results.push(hydrated);
                }
                
                // 3. Sort by safety score (highest score = safest)
                results.sort((a, b) => b._fit.score - a._fit.score);
                
                // 4. Return top 200 to prevent IPC bottleneck
                const cappedResults = results.slice(0, 200);
                
                self.postMessage({ type: 'SEARCH_SUCCESS', msgId, payload: { total: results.length, data: cappedResults } });
                break;
                
            case 'GET_OPTION':
                if (!dataStore) throw new Error('Data not initialized');
                const opt = dataStore.getHydratedOption(payload.id);
                if (!opt) throw new Error('Option not found');
                
                // Pre-filter cutoffs if year/round specified
                let optCutoffs = opt.cutoffs;
                if ((payload.year && payload.year !== 'all') || (payload.round && payload.round !== 'all')) {
                    const reqYear = payload.year && payload.year !== 'all' ? parseInt(payload.year, 10) : null;
                    const reqRound = payload.round && payload.round !== 'all' ? parseInt(payload.round, 10) : null;
                    optCutoffs = opt.cutoffs.filter(c => {
                        const yearMatch = !reqYear || c.year === reqYear;
                        const roundMatch = !reqRound || c.round === reqRound;
                        return yearMatch && roundMatch;
                    });
                }
                
                // Add Cutoff Analysis & Fit if rank provided
                const analyzedStats = analyzeCutoffs(optCutoffs);
                if (payload.rank) {
                    opt._fit = assessFit(payload.rank, analyzedStats);
                } else {
                    opt._fit = { classification: 'Unknown', explanation: 'No AIR provided to calculate fit.', confidence: analyzedStats.confidence };
                }
                opt._analyzedCutoffs = analyzedStats;
                
                // Fetch Sibling Options (Same Institute, Quota, Category) for Course Selector
                const siblingIds = searchIndex.search({
                    instituteId: opt.institute.id,
                    quotaId: opt.quota.id,
                    categoryId: opt.category.id
                });
                
                // Map to lightweight array { optionId, courseId, courseName }
                opt._siblings = siblingIds.map(sid => {
                    const siblingOpt = dataStore.getHydratedOption(sid);
                    return {
                        optionId: siblingOpt.id,
                        courseId: siblingOpt.course.id,
                        courseName: siblingOpt.course.name
                    };
                }).sort((a, b) => a.courseName.localeCompare(b.courseName));
                
                // Integrate Official Seat Matrix Provider
                opt.seatData = SeatMatrixProvider.getSeats({
                    instituteId: opt.institute.id,
                    courseId: opt.course.id,
                    quotaId: opt.quota.id,
                    categoryId: opt.category.id,
                    year: new Date().getFullYear(),
                    round: 1
                });
                
                // Integrate Official Domicile Eligibility Provider
                opt.eligibilityData = EligibilityProvider.checkDomicileEligibility({
                    candidateDomicile: payload.candidateDomicile || null, // from future user profile
                    instituteId: opt.institute.id,
                    courseId: opt.course.id,
                    quotaId: opt.quota.id,
                    categoryId: opt.category.id
                });
                
                self.postMessage({ type: 'SUCCESS', msgId, payload: opt });
                break;
                
            default:
                throw new Error(`Unknown message type: ${type}`);
        }
    } catch (error) {
        console.error('Worker Error:', error);
        self.postMessage({ type: 'ERROR', msgId, payload: error.message || String(error) });
    }
};
