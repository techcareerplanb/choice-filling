const fs = require('fs');
const path = require('path');

const unmatchedPath = path.join(__dirname, '../data/incoming/unmatched-records.json');
const rawDataPath = path.join(__dirname, '../data/raw/mcc_pg_2025_seat_matrix_source.json');
const processedDataPath = path.join(__dirname, '../data/processed/seat-matrix-2025.json');

const unmatched = JSON.parse(fs.readFileSync(unmatchedPath, 'utf8'));
const rawData = JSON.parse(fs.readFileSync(rawDataPath, 'utf8'));
const processedData = JSON.parse(fs.readFileSync(processedDataPath, 'utf8'));

const dupCSVPath = path.join(__dirname, '../reports/seat-matrix-duplicates-2025.csv');
const validCSVPath = path.join(__dirname, '../reports/seat-matrix-valid-not-modeled-2025.csv');
const validJSONPath = path.join(__dirname, '../reports/seat-matrix-valid-not-modeled-2025.json');
const coverageJSONPath = path.join(__dirname, '../reports/seat-matrix-coverage-2025.json');

// Ensure reports dir exists
if (!fs.existsSync(path.join(__dirname, '../reports'))) {
    fs.mkdirSync(path.join(__dirname, '../reports'));
}

// Map raw data for easy lookup
const rawMap = new Map();
rawData.forEach((row, idx) => rawMap.set(JSON.stringify(row), idx + 1));

// 1. Audit DUPLICATE records
const duplicates = unmatched.filter(u => u.reason === 'DUPLICATE_IDENTITY');
let dupCSV = 'sourceRowId,instituteCode,instituteName,program,quota,canonicalIdentity,subtype\n';
let possibleFalseDupCount = 0;

duplicates.forEach(dup => {
    let sourceRowId = rawMap.get(JSON.stringify(dup.row));
    let identity = `${dup.instId}_${dup.courseId}_${dup.qId}`;
    
    // Find the original record that mapped to this identity
    let originalMapped = processedData.find(p => `${p.instituteId}_${p.courseId}_${p.quotaId}` === identity);
    
    let subtype = 'UNKNOWN';
    if (originalMapped) {
        if (originalMapped.programRaw === dup.row.Program) {
            subtype = 'TRUE_SOURCE_DUPLICATE';
        } else {
            subtype = 'CANONICAL_DUPLICATE';
        }
    } else {
        subtype = 'POSSIBLE_FALSE_DUPLICATE';
        possibleFalseDupCount++;
    }
    
    let instCode = dup.instituteCode || '';
    let instName = (dup.row.Institute || '').replace(/"/g, '""');
    let prog = (dup.row.Program || '').replace(/"/g, '""');
    let quota = (dup.row.Quota || '').replace(/"/g, '""');
    
    dupCSV += `"${sourceRowId}","${instCode}","${instName}","${prog}","${quota}","${identity}","${subtype}"\n`;
});

fs.writeFileSync(dupCSVPath, dupCSV);

// 2. Audit VALID_BUT_NOT_MODELED records
const validNotModeled = unmatched.filter(u => u.reason === 'IDENTITY_MATCH_FAILED');
let validCSV = 'sourceRowId,instituteName,program,quota,subtype\n';
let coverageGapCount = 0;

const validRecordsExport = [];

validNotModeled.forEach(v => {
    let sourceRowId = rawMap.get(JSON.stringify(v.row));
    let progLower = (v.row.Program || '').toLowerCase();
    
    let subtype = 'OTHER';
    if (progLower.includes('dnb') || progLower.includes('nbems')) {
        subtype = 'DNB';
    } else if (progLower.includes('diploma')) {
        subtype = 'DIPLOMA';
    } else if (progLower.includes('m.ch') || progLower.includes('d.m') || progLower.includes('fellowship') || progLower.includes('fnb')) {
        subtype = 'SUPER_SPECIALTY';
    } else if (!v.instId) {
        subtype = 'NOT_IN_CANONICAL_DATABASE';
    } else if (v.instId && !v.courseId) {
        if (progLower.includes('m.d.') || progLower.includes('m.s.')) {
            subtype = 'COVERAGE_GAP';
            coverageGapCount++;
        } else {
            subtype = 'OTHER';
        }
    }
    
    let instName = (v.row.Institute || '').replace(/"/g, '""');
    let prog = (v.row.Program || '').replace(/"/g, '""');
    let quota = (v.row.Quota || '').replace(/"/g, '""');
    
    validCSV += `"${sourceRowId}","${instName}","${prog}","${quota}","${subtype}"\n`;
    
    validRecordsExport.push({
        sourceRowId,
        instituteName: v.row.Institute,
        program: v.row.Program,
        quota: v.row.Quota,
        subtype
    });
});

fs.writeFileSync(validCSVPath, validCSV);
fs.writeFileSync(validJSONPath, JSON.stringify(validRecordsExport, null, 2));

// 3. Audit OUT_OF_SCOPE
const outOfScope = validRecordsExport.filter(v => v.subtype === 'DNB' || v.subtype === 'DIPLOMA' || v.subtype === 'SUPER_SPECIALTY');
// These represent the explicitly out of scope records.

// 4. Verify Matched Coverage
const totalSourceRows = rawData.length;
const matched = processedData.length;
const validButNotModeled = validNotModeled.length;
const outOfScopeCount = outOfScope.length;

let stdMdMsMatched = 0;
processedData.forEach(p => {
    let pLower = p.programRaw.toLowerCase();
    if (pLower.includes('m.d.') || pLower.includes('m.s.')) {
        stdMdMsMatched++;
    }
});

let stdMdMsUnmatched = coverageGapCount;

const coverageReport = {
    totalSourceRows,
    matched,
    validButNotModeled,
    duplicates: duplicates.length,
    outOfScope: outOfScopeCount,
    mappingError: 0,
    ambiguous: 0,
    standardMdMsRecordsMatched: stdMdMsMatched,
    standardMdMsRecordsNotMatched: stdMdMsUnmatched
};

fs.writeFileSync(coverageJSONPath, JSON.stringify(coverageReport, null, 2));

// 5. Verify source values are untouched
let valueMutationCount = 0;
processedData.forEach(p => {
    // Find raw data equivalent
    let rawMatches = rawData.filter(r => r.Institute === p.instituteName && r.Program === p.programRaw);
    if (rawMatches.length > 0) {
        let raw = rawMatches[0];
        let rawTotal = parseInt(raw.TotalSeats, 10) || 0;
        if (p.totalSeats !== rawTotal) {
            valueMutationCount++;
        }
    }
});

console.log(`Audit Complete.
POSSIBLE_FALSE_DUPLICATE: ${possibleFalseDupCount}
COVERAGE_GAP: ${coverageGapCount}
SOURCE_VALUE_MUTATION: ${valueMutationCount}`);
