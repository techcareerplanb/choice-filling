const fs = require('fs');
const stringSimilarity = require('string-similarity');

const u = require('../reports/unmatched-seat-matrix-2025.json');
const insts = require('../data/processed/institutes.json');

const failedCodes = [...new Set(u.filter(x => x.reason === 'IDENTITY_MATCH_FAILED' && !x.candidateInstitute).map(x => x.instituteCode))];

const codeToName = {};
u.forEach(x => { if (x.instituteCode) codeToName[x.instituteCode] = x.instituteName; });

const instNames = insts.map(i => i.name.toLowerCase());

let found = 0;
let missing = 0;

failedCodes.forEach(code => {
    const rawName = codeToName[code];
    if (!rawName) return;
    
    const cleanName = rawName.replace(/\([0-9a-zA-Z]+\)/g, '').replace(/[^a-zA-Z0-9 ]/g, '').toLowerCase().trim();
    if (!cleanName) return;

    const match = stringSimilarity.findBestMatch(cleanName, instNames);
    if (match.bestMatch.rating > 0.4) {
        console.log(`[POTENTIAL MAP] ${code}: "${rawName}"  ==>  "${insts[match.bestMatchIndex].name}" (Score: ${match.bestMatch.rating.toFixed(2)})`);
        found++;
    } else {
        missing++;
    }
});

console.log(`Found potential aliases: ${found}, Missing completely: ${missing}`);
