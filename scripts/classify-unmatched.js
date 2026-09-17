const fs = require('fs');
const path = require('path');

const processedDataPath = path.join(__dirname, '../data/processed/seat-matrix-2025.json');
const unmatchedDataPath = path.join(__dirname, '../data/incoming/unmatched-records.json');
const instPath = path.join(__dirname, '../data/processed/institutes.json');
const coursePath = path.join(__dirname, '../data/processed/courses.json');
const optionPath = path.join(__dirname, '../data/processed/options.json');

const seats = JSON.parse(fs.readFileSync(processedDataPath, 'utf8'));
const unmatched = JSON.parse(fs.readFileSync(unmatchedDataPath, 'utf8'));
const institutes = JSON.parse(fs.readFileSync(instPath, 'utf8'));
const courses = JSON.parse(fs.readFileSync(coursePath, 'utf8'));
const options = JSON.parse(fs.readFileSync(optionPath, 'utf8'));

const outCsv = path.join(__dirname, '../reports/unmatched-seat-matrix-2025.csv');
const outJson = path.join(__dirname, '../reports/unmatched-seat-matrix-2025.json');

if (!fs.existsSync(path.join(__dirname, '../reports'))) {
    fs.mkdirSync(path.join(__dirname, '../reports'));
}

const classified = [];
const summary = {
    OUT_OF_SCOPE: 0,
    VALID_BUT_NOT_MODELED: 0,
    MAPPING_ERROR: 0,
    AMBIGUOUS: 0,
    DUPLICATE: 0
};

// Helper maps
const instMap = new Map(institutes.map(i => [i.id, i]));
const courseMap = new Map(courses.map(c => [c.id, c]));

// DNB and Diploma are typically out of scope unless modeled
// Let's assume options.json contains what we strictly model.
unmatched.forEach((u, idx) => {
    let classification = 'UNKNOWN';
    let cInst = u.instId ? (instMap.get(u.instId)?.name || u.instId) : null;
    let cCourse = u.courseId ? (courseMap.get(u.courseId)?.name || u.courseId) : null;

    if (u.reason === 'DUPLICATE_IDENTITY') {
        classification = 'DUPLICATE';
    } else if (u.reason === 'IDENTITY_MATCH_FAILED') {
        // Is it out of scope?
        const progLower = (u.row.program || u.row.Program || '').toLowerCase();
        const instLower = (u.row.institute || u.row.Institute || '').toLowerCase();
        
        // Out of scope: DNB, Diploma, Fellowship, FNB, non-medical (rare in MCC but possible)
        if (progLower.includes('dnb') || progLower.includes('diploma') || progLower.includes('fnb') || progLower.includes('fellowship') || progLower.includes('nursing') || progLower.includes('m.ch') || progLower.includes('d.m')) {
            classification = 'OUT_OF_SCOPE';
        }
        
        if (classification === 'UNKNOWN') {
            // Since we have systematically extracted all aliases > 0.4 similarity and mapped them,
            // any institute failing to match now genuinely does not exist in the canonical options dataset.
            classification = 'VALID_BUT_NOT_MODELED';
        }
    }

    if (classification === 'UNKNOWN') {
        classification = 'MAPPING_ERROR';
    }

    summary[classification]++;
    
    classified.push({
        sourceRowId: idx + 1,
        instituteCode: u.instituteCode,
        instituteName: (u.row.institute || u.row.Institute || '').replace(/\n/g, ' '),
        programRaw: (u.row.program || u.row.Program || '').replace(/\n/g, ' '),
        quota: u.row.quota || u.row.Quota || '',
        totalSeats: u.row.seats ? u.row.seats[10] : u.row.TotalSeats,
        reason: u.reason,
        candidateInstitute: cInst,
        candidateCourse: cCourse,
        mappingStatus: classification
    });
});

fs.writeFileSync(outJson, JSON.stringify(classified, null, 2));

// CSV
const headers = ['sourceRowId', 'instituteCode', 'instituteName', 'programRaw', 'quota', 'totalSeats', 'reason', 'candidateInstitute', 'candidateCourse', 'mappingStatus'];
let csvContent = headers.join(',') + '\n';
classified.forEach(c => {
    const row = headers.map(h => {
        let val = c[h] || '';
        return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvContent += row.join(',') + '\n';
});
fs.writeFileSync(outCsv, csvContent);

console.log('Summary:', JSON.stringify(summary, null, 2));
