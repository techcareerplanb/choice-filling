import fs from 'fs';
import path from 'path';

const outPath = path.join(process.cwd(), 'reports', 'choice-option-data-coverage.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });

// Load data
const options = JSON.parse(fs.readFileSync('data/processed/options.json', 'utf8'));
const cutoffs = JSON.parse(fs.readFileSync('data/processed/cutoffs.json', 'utf8'));
const aiqSeats = JSON.parse(fs.readFileSync('data/processed/seat-matrix-2025.json', 'utf8'));
const additionalSeats = JSON.parse(fs.readFileSync('data/processed/seat-matrix-additional-2025.json', 'utf8'));
const quotas = JSON.parse(fs.readFileSync('data/processed/quotas.json', 'utf8'));
const categories = JSON.parse(fs.readFileSync('data/processed/categories.json', 'utf8'));

// Lookup Maps
const cutoffsByOption = {};
for (const c of cutoffs) {
    if (!cutoffsByOption[c.optionId]) cutoffsByOption[c.optionId] = [];
    cutoffsByOption[c.optionId].push(c);
}

const seatsLookup = {};
const allSeats = aiqSeats.map(s => ({ ...s, sourceType: 'AIQ' })).concat(additionalSeats);

for (const s of allSeats) {
    const key = `${s.instituteId}-${s.courseId}-${s.quotaId}`;
    if (!seatsLookup[key]) seatsLookup[key] = [];
    seatsLookup[key].push(s);
}

const report = {
  summary: {
    totalChoiceOptions: options.length,
    withPreviousYearCutoff: 0,
    withoutPreviousYearCutoff: 0,
    withSeatMatrix: 0,
    withoutSeatMatrix: 0,
    withBoth: 0,
    withNeither: 0,
    outOfScope: 0,
    cutoffOnly: 0,
    seatMatrixOnly: 0,
    mappingError: 0
  },
  coverageByQuota: {},
  coverageBySourceType: {},
  coverageByCategory: {},
  records: []
};

// Examples for console log
const examples = {
  CUTOFF_ONLY: [],
  SEAT_MATRIX_ONLY: [],
  NEITHER_AVAILABLE: [],
  OUT_OF_SCOPE: []
};

// Recognized scope
const SCOPE_QUOTAS = new Set([1, 6, 7, 145]); // AIQ, DEEMED, CENTRAL_INTERNAL, DNB - from provided scopes

for (const opt of options) {
    const quota = quotas.find(q => q.id === opt.quotaId);
    const category = categories.find(c => c.id === opt.categoryId);
    const isOutOfScope = !SCOPE_QUOTAS.has(opt.quotaId);

    // Track coverage categories
    const qName = quota ? quota.short_name : 'Unknown';
    if (!report.coverageByQuota[qName]) report.coverageByQuota[qName] = { total: 0, withCutoff: 0, withSeat: 0 };
    report.coverageByQuota[qName].total++;

    const cName = category ? category.name : 'Unknown';
    if (!report.coverageByCategory[cName]) report.coverageByCategory[cName] = { total: 0, withCutoff: 0, withSeat: 0 };
    report.coverageByCategory[cName].total++;

    // Cutoffs
    const optCutoffs = cutoffsByOption[opt.id] || [];
    const prevCutoffs = optCutoffs.filter(c => c.year < 2025);
    const hasCutoff = prevCutoffs.length > 0;
    const availableCutoffYears = [...new Set(prevCutoffs.map(c => c.year))].sort();
    const availableCutoffRounds = [...new Set(prevCutoffs.map(c => c.round))].sort();

    // Seats
    const key = `${opt.instituteId}-${opt.courseId}-${opt.quotaId}`;
    const seatRecords = seatsLookup[key] || [];
    let hasSeat = false;
    let seatSource = null;

    for (const sr of seatRecords) {
        if (sr.sourceType === 'DEEMED') {
            // Deemed data does not have category breakdowns, uses totalSeats
            if (sr.totalSeats > 0) {
                hasSeat = true;
                seatSource = 'DEEMED';
                break;
            }
        } else {
            // Check specific category
            if (sr.categorySeats && sr.categorySeats[opt.categoryId] > 0) {
                hasSeat = true;
                seatSource = sr.sourceType;
                break;
            }
        }
    }

    let status = '';
    if (isOutOfScope) {
        status = 'OUT_OF_SCOPE';
        report.summary.outOfScope++;
    } else if (hasCutoff && hasSeat) {
        status = 'BOTH_AVAILABLE';
        report.summary.withBoth++;
    } else if (hasCutoff && !hasSeat) {
        status = 'CUTOFF_ONLY';
        report.summary.cutoffOnly++;
    } else if (!hasCutoff && hasSeat) {
        status = 'SEAT_MATRIX_ONLY';
        report.summary.seatMatrixOnly++;
    } else {
        status = 'NEITHER_AVAILABLE';
        report.summary.withNeither++;
    }

    if (!isOutOfScope) {
        if (hasCutoff) report.summary.withPreviousYearCutoff++;
        else report.summary.withoutPreviousYearCutoff++;

        if (hasSeat) report.summary.withSeatMatrix++;
        else report.summary.withoutSeatMatrix++;
    }

    if (hasCutoff) report.coverageByQuota[qName].withCutoff++;
    if (hasSeat) report.coverageByQuota[qName].withSeat++;
    if (hasCutoff) report.coverageByCategory[cName].withCutoff++;
    if (hasSeat) report.coverageByCategory[cName].withSeat++;

    if (seatSource) {
        if (!report.coverageBySourceType[seatSource]) report.coverageBySourceType[seatSource] = { total: 0 };
        report.coverageBySourceType[seatSource].total++;
    }

    const record = {
        optionId: opt.id,
        instituteId: opt.instituteId,
        courseId: opt.courseId,
        quotaId: opt.quotaId,
        categoryId: opt.categoryId,
        hasPreviousYearCutoff: hasCutoff ? true : 'UNAVAILABLE',
        availableCutoffYears,
        availableCutoffRounds,
        hasSeatMatrix: hasSeat ? true : 'UNAVAILABLE',
        seatMatrixYear: hasSeat ? 2025 : 'UNAVAILABLE',
        seatMatrixSourceType: seatSource || 'UNAVAILABLE',
        status
    };

    report.records.push(record);

    if (status !== 'BOTH_AVAILABLE' && examples[status] && examples[status].length < 10) {
        examples[status].push(record);
    }
}

fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

console.log(`\n--- CHOICE OPTION DATA COVERAGE AUDIT ---`);
console.log(`Report generated at: ${outPath}\n`);

console.log(`| Coverage state | Number of choice options |`);
console.log(`|---|---:|`);
console.log(`| Both cutoff and seat matrix | ${report.summary.withBoth.toLocaleString()} |`);
console.log(`| Cutoff only | ${report.summary.cutoffOnly.toLocaleString()} |`);
console.log(`| Seat matrix only | ${report.summary.seatMatrixOnly.toLocaleString()} |`);
console.log(`| Neither | ${report.summary.withNeither.toLocaleString()} |`);
console.log(`| Out of scope | ${report.summary.outOfScope.toLocaleString()} |`);
console.log(`| Mapping error / ambiguous | ${report.summary.mappingError.toLocaleString()} |`);
console.log(`\nTotals: ${report.summary.totalChoiceOptions.toLocaleString()} Options Analyzed`);

console.log(`\n--- REPRESENTATIVE EXAMPLES ---`);
for (const [state, exList] of Object.entries(examples)) {
    if (exList.length === 0) continue;
    console.log(`\n* ${state} (Showing up to 10):`);
    for (const ex of exList) {
        console.log(`  - Option ${ex.optionId}: Inst ${ex.instituteId} | Course ${ex.courseId} | Quota ${ex.quotaId} | Cat ${ex.categoryId}`);
        let reasons = [];
        if (state === 'CUTOFF_ONLY') reasons.push("Seat matrix missing for 2025 in this category.");
        if (state === 'SEAT_MATRIX_ONLY') reasons.push("No historical 2024 (or earlier) cutoffs found.");
        if (state === 'NEITHER_AVAILABLE') reasons.push("No historical cutoff AND no 2025 seat matrix.");
        if (state === 'OUT_OF_SCOPE') reasons.push(`Quota ID ${ex.quotaId} is unhandled/out of scope.`);
        console.log(`    Reason: ${reasons.join(' ')}`);
    }
}
