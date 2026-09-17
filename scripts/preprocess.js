const fs = require('fs');
const path = require('path');

const INPUT_PATH = path.join(__dirname, '../data/All-India.json');
const OUT_DIR = path.join(__dirname, '../data/processed');

console.log('Starting relational data preprocessing...');

if (!fs.existsSync(INPUT_PATH)) {
    console.error(`Input file not found: ${INPUT_PATH}`);
    process.exit(1);
}

if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
}

const rawData = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));

// Dictionaries
const institutes = {};
const courses = {};
const quotas = {};
const counsellings = {};

// ID Maps for strings
const categoryToId = {};
let nextCatId = 1;

// Relational Tables
const categories = []; // [{ id, name }]
const options = [];    // [{ id, instituteId, courseId, quotaId, categoryId, counsellingId, bedsCount, bedsStatus }]
const cutoffs = [];    // [{ optionId, year, round, closingRank, allotmentsCount }]
const financials = []; // [{ optionId, feeAmount, feeRaw, feeHasCaveat, stipendYear1, stipendRaw, stipendHasCaveat, bondYears, bondPenalty, bondHasCaveat }]

// Metadata Tracking
const availableYears = new Set();
const availableRounds = new Set();

// Indexes
const indexes = {
    byInstitute: {}, // instId -> [optionIds]
    byCourse: {},    // courseId -> [optionIds]
    byQuota: {},     // quotaId -> [optionIds]
    byCategory: {},  // catId -> [optionIds]
    byState: {}      // stateStr -> [optionIds]
};

// Helper for indexes
const addIndex = (indexObj, key, optionId) => {
    if (key === null || key === undefined) return;
    if (!indexObj[key]) indexObj[key] = [];
    indexObj[key].push(optionId);
};

// Helper for financials
const parseFinancial = (val) => {
    if (!val) return { amount: null, hasCaveat: false, original: null };
    const str = String(val);
    const hasCaveat = str.includes('*');
    const numStr = str.replace(/[^0-9]/g, '');
    const amount = numStr.length > 0 ? parseInt(numStr, 10) : null;
    return { amount, hasCaveat, original: str };
};

// Helper for states
const normalizeState = (str) => {
    if (!str || typeof str !== 'string') return null;
    const trimmed = str.trim();
    if (!trimmed) return null;
    return trimmed.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

rawData.forEach(item => {
    const optionId = item.id;
    const normState = normalizeState(item.state);
    
    // --- NORMALIZE ENTITIES ---
    let instId = null;
    if (item.institute) {
        instId = item.institute.id;
        if (!institutes[instId]) {
            institutes[instId] = {
                id: instId,
                name: item.institute.name,
                short_name: item.institute.short_name,
                state: normState,
                district: item.institute.district,
                logo_url: item.institute.logo_url
            };
        }
    }
    
    let courseId = null;
    if (item.course) {
        courseId = item.course.id;
        if (!courses[courseId]) {
            courses[courseId] = {
                id: courseId,
                name: item.course.name,
                short_name: item.course.short_name
            };
        }
    }
    
    let quotaId = null;
    if (item.quota) {
        quotaId = item.quota.id;
        if (!quotas[quotaId]) {
            quotas[quotaId] = {
                id: quotaId,
                name: item.quota.name,
                short_name: item.quota.short_name,
                master_quota: item.quota.master_quota
            };
        }
    }
    
    let counsId = null;
    if (item.counselling) {
        counsId = item.counselling.id;
        if (!counsellings[counsId]) {
            counsellings[counsId] = {
                id: counsId,
                name: item.counselling.name,
                short_name: item.counselling.short_name
            };
        }
    }
    
    let catId = null;
    if (item.category) {
        if (!categoryToId[item.category]) {
            catId = nextCatId++;
            categoryToId[item.category] = catId;
            categories.push({ id: catId, name: item.category });
        } else {
            catId = categoryToId[item.category];
        }
    }
    
    // --- NORMALIZE BEDS ---
    let bedsCount = null;
    let bedsStatus = 'available';
    if (!item.beds || item.beds === '-' || item.beds === 'Info Not Available' || item.beds === 'Not Available' || item.beds === '0') {
        bedsStatus = 'unavailable';
    } else {
        bedsCount = parseInt(item.beds.replace(/[^0-9]/g, ''), 10);
        if (isNaN(bedsCount)) bedsStatus = 'unavailable';
    }
    
    // --- BUILD OPTION ---
    options.push({
        id: optionId,
        instituteId: instId,
        courseId: courseId,
        quotaId: quotaId,
        categoryId: catId,
        counsellingId: counsId,
        bedsCount: bedsCount,
        bedsStatus: bedsStatus
    });
    
    // --- BUILD INDEXES ---
    addIndex(indexes.byInstitute, instId, optionId);
    addIndex(indexes.byCourse, courseId, optionId);
    addIndex(indexes.byQuota, quotaId, optionId);
    addIndex(indexes.byCategory, catId, optionId);
    addIndex(indexes.byState, normState, optionId);
    
    // --- EXTRACT CUTOFFS ---
    Object.keys(item).forEach(key => {
        if (key.startsWith('cr_')) {
            const parts = key.split('_'); 
            if (parts.length === 3 && item[key]) {
                cutoffs.push({
                    optionId: optionId,
                    year: parseInt(parts[1], 10),
                    round: parseInt(parts[2], 10),
                    closingRank: item[key].closing_rank,
                    counsellingRank: item[key].counselling_rank,
                    aiRank: item[key].ai_rank,
                    allotmentsCount: item[key].allotments_count,
                    inserviceCandidate: item[key].inservice_candidate,
                    candidateFlag: item[key].candidate_flag
                });
                
                availableYears.add(parseInt(parts[1], 10));
                availableRounds.add(parseInt(parts[2], 10));
            }
        }
    });
    
    // --- EXTRACT FINANCIALS ---
    const feeData = parseFinancial(item.fee);
    const stipendData = parseFinancial(item.stipend_year_1);
    const bondYearsData = parseFinancial(item.bond_years);
    const bondPenaltyData = parseFinancial(item.bond_penalty);
    
    financials.push({
        optionId: optionId,
        
        feeAmount: feeData.amount,
        feeRaw: feeData.original,
        feeHasCaveat: feeData.hasCaveat,
        
        stipendYear1: stipendData.amount,
        stipendRaw: stipendData.original,
        stipendHasCaveat: stipendData.hasCaveat,
        
        bondYears: bondYearsData.amount,
        bondPenalty: bondPenaltyData.amount,
        bondHasCaveat: (bondYearsData.hasCaveat || bondPenaltyData.hasCaveat)
    });
});

// Metadata
const metadata = {
    datasetVersion: "1.0.0",
    source: "All-India.json",
    retrievedAt: new Date().toISOString(),
    recordCount: rawData.length,
    historicalYears: Array.from(availableYears).sort(),
    availableRounds: Array.from(availableRounds).sort(),
    generatedAt: new Date().toISOString()
};

// Write to files
fs.writeFileSync(path.join(OUT_DIR, 'metadata.json'), JSON.stringify(metadata, null, 2));
fs.writeFileSync(path.join(OUT_DIR, 'institutes.json'), JSON.stringify(Object.values(institutes)));
fs.writeFileSync(path.join(OUT_DIR, 'courses.json'), JSON.stringify(Object.values(courses)));
fs.writeFileSync(path.join(OUT_DIR, 'quotas.json'), JSON.stringify(Object.values(quotas)));
fs.writeFileSync(path.join(OUT_DIR, 'counsellings.json'), JSON.stringify(Object.values(counsellings)));
fs.writeFileSync(path.join(OUT_DIR, 'categories.json'), JSON.stringify(categories));
fs.writeFileSync(path.join(OUT_DIR, 'options.json'), JSON.stringify(options));
fs.writeFileSync(path.join(OUT_DIR, 'cutoffs.json'), JSON.stringify(cutoffs));
fs.writeFileSync(path.join(OUT_DIR, 'financials.json'), JSON.stringify(financials));
fs.writeFileSync(path.join(OUT_DIR, 'indexes.json'), JSON.stringify(indexes));

console.log('--- PREPROCESSING STATS ---');
console.log(`Source Records: ${rawData.length}`);
console.log(`Processed Options: ${options.length}`);
console.log(`Total Cutoffs: ${cutoffs.length}`);
console.log(`Institutes: ${Object.keys(institutes).length}`);
console.log(`Courses: ${Object.keys(courses).length}`);
console.log(`Quotas: ${Object.keys(quotas).length}`);
console.log(`Categories: ${categories.length}`);
console.log('---------------------------');
