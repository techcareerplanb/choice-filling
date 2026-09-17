const fs = require('fs');
const path = require('path');

const processedDataPath = path.join(__dirname, '../data/processed/seat-matrix-2025.json');
const unmatchedDataPath = path.join(__dirname, '../data/incoming/unmatched-records.json');

const seats = JSON.parse(fs.readFileSync(processedDataPath, 'utf8'));
const unmatched = JSON.parse(fs.readFileSync(unmatchedDataPath, 'utf8'));

const report = {
    totalParsedRows: seats.length + unmatched.length,
    matchedRows: seats.length,
    unmatchedRows: unmatched.length,
    duplicateIdentity: 0,
    identityMatchFailed: 0,
    seatReconciliationFailed: 0,
    zeroSeats: 0,
    missingSeats: 0
};

unmatched.forEach(u => {
    if (u.reason === 'DUPLICATE_IDENTITY') report.duplicateIdentity++;
    if (u.reason === 'IDENTITY_MATCH_FAILED') report.identityMatchFailed++;
    if (u.reason === 'SEAT_RECONCILIATION_FAILED') report.seatReconciliationFailed++;
});

seats.forEach(s => {
    if (s.totalSeats === 0) report.zeroSeats++;
    if (s.totalSeats === null || s.totalSeats === undefined) report.missingSeats++;
});

console.log(JSON.stringify(report, null, 2));
