const fs = require('fs');
const path = require('path');

const INPUT_PATH = path.join(__dirname, '../data/All-India.json');
const SEAT_MATRIX_PATH = path.join(__dirname, '../data/processed/seat-matrix-2025.json');

console.log('Starting data validation...');

if (!fs.existsSync(INPUT_PATH)) {
    console.error(`ERROR: Input file not found: ${INPUT_PATH}`);
    process.exit(1);
}

let rawData;
let seatMatrixData;
try {
    rawData = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));
    if (fs.existsSync(SEAT_MATRIX_PATH)) {
        seatMatrixData = JSON.parse(fs.readFileSync(SEAT_MATRIX_PATH, 'utf8'));
    } else {
        seatMatrixData = [];
    }
} catch (e) {
    console.error(`ERROR: Failed to parse input JSON: ${e.message}`);
    process.exit(1);
}

let errors = 0;
let warnings = 0;
let infos = 0;

const logError = (msg) => { console.error(`[ERROR] ${msg}`); errors++; };
const logWarning = (msg) => { console.warn(`[WARNING] ${msg}`); warnings++; };
const logInfo = (msg) => { console.log(`[INFO] ${msg}`); infos++; };

const optionIds = new Set();
const compositeIdentities = new Map();

// Stats
let institutesCount = new Set();
let coursesCount = new Set();
let yearRoundStats = {};

let missingFee = 0;
let feeCaveats = 0;
let missingStipend = 0;
let missingBond = 0;
let missingBeds = 0;

rawData.forEach((item, index) => {
    // 1. Identity Integrity Errors
    const optionId = item.id;
    if (optionId === undefined || optionId === null) {
        logError(`Record at index ${index} is missing an 'id'.`);
        return; // Skip further checks for this malformed record
    }
    
    if (optionIds.has(optionId)) {
        logError(`Duplicate optionId found: ${optionId}`);
    }
    optionIds.add(optionId);
    
    if (!item.institute || !item.institute.id) { logError(`Option ${optionId} missing valid institute reference.`); }
    if (!item.course || !item.course.id) { logError(`Option ${optionId} missing valid course reference.`); }
    if (!item.quota || !item.quota.id) { logError(`Option ${optionId} missing valid quota reference.`); }
    if (!item.category) { logError(`Option ${optionId} missing category reference.`); }
    if (!item.counselling || !item.counselling.id) { logError(`Option ${optionId} missing valid counselling reference.`); }
    
    const instId = item.institute?.id || 'UNKN';
    const courseId = item.course?.id || 'UNKN';
    const quotaId = item.quota?.id || 'UNKN';
    const cat = item.category || 'UNKN';
    const counsId = item.counselling?.id || 'UNKN';
    
    const compositeId = `${instId}|${courseId}|${quotaId}|${cat}|${counsId}`;
    if (compositeIdentities.has(compositeId)) {
        logError(`Duplicate composite identity found for ${compositeId}. OptionIds: ${compositeIdentities.get(compositeId)} and ${optionId}`);
    } else {
        compositeIdentities.set(compositeId, optionId);
    }
    
    institutesCount.add(instId);
    coursesCount.add(courseId);
    
    // 2. Cutoff/Structural Errors
    Object.keys(item).forEach(key => {
        if (key.startsWith('cr_')) {
            const parts = key.split('_');
            if (parts.length === 3) {
                const year = parseInt(parts[1], 10);
                const round = parseInt(parts[2], 10);
                
                if (isNaN(year) || year < 2000 || year > 2100) {
                    logError(`Option ${optionId}: Invalid year ${year} in key ${key}`);
                }
                if (isNaN(round) || round < 1 || round > 10) {
                    logError(`Option ${optionId}: Invalid round ${round} in key ${key}`);
                }
                
                if (item[key]) {
                    const cr = item[key].closing_rank;
                    if (cr !== undefined && cr !== null) {
                        if (isNaN(cr) || cr <= 0) {
                            logError(`Option ${optionId}: Invalid closing_rank ${cr} in key ${key}`);
                        } else {
                            if (!yearRoundStats[year]) yearRoundStats[year] = {};
                            if (!yearRoundStats[year][round]) yearRoundStats[year][round] = 0;
                            yearRoundStats[year][round]++;
                        }
                    } else {
                        logWarning(`Option ${optionId}: Cutoff object exists for ${key} but missing closing_rank`);
                    }
                }
            } else {
                logError(`Option ${optionId}: Malformed cutoff key format ${key}`);
            }
        }
    });
    
    // 3. Missing/Warnings
    if (!item.fee || item.fee === 'Info Not Available' || item.fee === '-' || item.fee === 'Not Available') missingFee++;
    else if (String(item.fee).includes('*')) feeCaveats++;
    
    if (!item.stipend_year_1 || item.stipend_year_1 === 'Info Not Available' || item.stipend_year_1 === '-' || item.stipend_year_1 === 'Not Available') missingStipend++;
    
    if (!item.bond_years || item.bond_years === 'Info Not Available' || item.bond_years === '-' || item.bond_years === 'Not Available') missingBond++;
    
    if (!item.beds || item.beds === 'Info Not Available' || item.beds === '-' || item.beds === 'Not Available' || item.beds === '0') missingBeds++;
});

// Validate Seat Matrix Data
const seatMatrixIdentities = new Set();
let seatMatrixErrors = 0;

if (seatMatrixData) {
    seatMatrixData.forEach((item, index) => {
        if (!item.instituteId || !item.courseId || !item.quotaId) {
            logError(`Seat Matrix record at index ${index} missing valid inst/course/quota reference.`);
            seatMatrixErrors++;
            return;
        }
        
        const identity = `${item.instituteId}|${item.courseId}|${item.quotaId}`;
        if (seatMatrixIdentities.has(identity)) {
            logError(`Seat Matrix duplicate record for identity: ${identity}`);
            seatMatrixErrors++;
        }
        seatMatrixIdentities.add(identity);
        
        if (typeof item.totalSeats !== 'number' || item.totalSeats <= 0) {
            logError(`Seat Matrix invalid totalSeats for ${identity}: ${item.totalSeats}`);
            seatMatrixErrors++;
        }
        
        let sum = 0;
        if (item.categorySeats) {
            for (const catId of Object.keys(item.categorySeats)) {
                sum += item.categorySeats[catId];
            }
        }
        if (sum !== item.totalSeats) {
            logError(`Seat Matrix reconciliation failed for ${identity}. Sum of categories (${sum}) != totalSeats (${item.totalSeats})`);
            seatMatrixErrors++;
        }
        
        if (!item.year || !item.round) {
            logError(`Seat Matrix missing year or round for ${identity}`);
            seatMatrixErrors++;
        }
    });
}

console.log('\nDATA VALIDATION');
console.log('────────────────────────────');
console.log(`Records checked:       ${rawData.length}`);
console.log(`Errors:                     ${errors}`);
console.log(`Warnings:               ${warnings}`);
console.log(`Info:                     ${infos}`);
console.log('────────────────────────────');
console.log(`Institutes:             ${institutesCount.size}`);
console.log(`Courses:                ${coursesCount.size}`);
console.log(`Options:                ${optionIds.size}`);
console.log(`Seat Matrix Records:    ${seatMatrixData.length}`);
console.log('');

Object.keys(yearRoundStats).sort().forEach(year => {
    console.log(`${year}:`);
    Object.keys(yearRoundStats[year]).sort().forEach(round => {
        console.log(`  R${round}: ${yearRoundStats[year][round]}`);
    });
});

console.log('');
console.log(`Missing fee:             ${missingFee}`);
console.log(`Fee caveat:              ${feeCaveats}`);
console.log(`Missing stipend:         ${missingStipend}`);
console.log(`Missing bond:            ${missingBond}`);
console.log(`Missing beds:            ${missingBeds}`);
console.log('────────────────────────────');

if (errors > 0) {
    console.log('\\n✗ Validation failed');
    console.log('Build aborted because critical data integrity errors were detected.');
    process.exit(1);
} else {
    console.log('\\n✓ Validation passed');
    process.exit(0);
}
