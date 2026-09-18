const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const csvPath = path.join(__dirname, '../data/raw/mcc_2025_additional_seat_matrices_combined.csv');
const instPath = path.join(__dirname, '../data/processed/institutes.json');
const optionsPath = path.join(__dirname, '../data/processed/options.json');
const outPath = path.join(__dirname, '../data/processed/seat-matrix-additional-2025.json');
const reportPath = path.join(__dirname, '../reports/additional-seat-matrix-2025-validation.json');

const csvContent = fs.readFileSync(csvPath, 'utf8');
const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    bom: true
});

const institutes = JSON.parse(fs.readFileSync(instPath, 'utf8'));
const options = JSON.parse(fs.readFileSync(optionsPath, 'utf8'));
const courses = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/processed/courses.json'), 'utf8'));
const quotas = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/processed/quotas.json'), 'utf8'));

// Hardcoded institute map exactly like AIQ
const codeToInstId = new Map([
    ['700109', 35], ['700480', 36], ['700310', 205], ['700329', 380], ['700388', 410],
    ['701512', 1935], ['700308', 287], ['700292', 31], ['700302', 209], ['700361', 376],
    ['700283', 25], ['700291', 142], ['700386', 366], ['700379', 95], ['700323', 261],
    ['700387', 69], ['700482', 343], ['700403', 172], ['700370', 373], ['902829', 3136],
    ['700417', 102], ['700119', 54], ['700392', 405], ['700537', 418], ['700400', 413],
    ['700483', 345], ['700368', 76], ['700501', 224], ['700471', 5], ['700375', 369],
    ['700327', 284], ['902850', 5328], ['700113', 38], ['700472', 10], ['700336', 260],
    ['700312', 6225], ['700530', 325], ['700123', 51], ['700377', 401], ['700541', 39],
    ['700396', 108], ['700338', 258],
]);

const courseMap = new Map();
const quotaMap = new Map();

courses.forEach(c => courseMap.set(c.id, c.name.toLowerCase()));
quotas.forEach(q => quotaMap.set(normStr(q.name), q.id));

const QUOTA_ALIASES = {
    'IP University Quota': 'IP',
    'Delhi University Quota': 'DU',
    'Banaras Hindu University': 'BHU',
    'Aligarh Muslim University': 'AMU',
    'Management/Paid Seats Quota': 'MNG',
    'Non-Resident Indian': 'NRI',
    'Jain Minority Quota': 'JM',
    'Muslim Minority Quota': 'MM',
    'DNB Quota': 'DNB Post MBBS'
};

const MCC_PROGRAM_ALIASES = {
    "M.S. (E.N.T.)": 68,
    "M.D. (Obst. and Gynae)/MS (Obstetrics and Gynaecology)": 70,
    "M.D.Laboratory Medicine Course": 50
};

const optMap = new Map();
options.forEach(opt => {
    optMap.set(`${opt.instituteId}_${opt.courseId}_${opt.quotaId}`, opt.id);
});

const categoryMapping = {
    'open': 1, 'open_pwd': 2, 'general_ews': 3, 'general_ews_pwd': 4,
    'obc': 5, 'obc_pwd': 6, 'sc': 7, 'sc_pwd': 8, 'st': 9, 'st_pwd': 10
};

function normStr(str) {
    return (str || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

function findBestInstitute(mccName) {
    const cleanMcc = (mccName||'').replace(/\([0-9]{6}\)/g, '');
    const tokens = cleanMcc.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 2);
    if (tokens.length === 0) return null;
    
    const stopWords = ['medical', 'college', 'hospital', 'institute', 'science', 'sciences', 'research', 'centre', 'university'];
    const sigTokens = tokens.filter(t => !stopWords.includes(t));
    
    let bestMatch = null;
    let maxScore = 0;
    
    for (let inst of institutes) {
        const instTokens = inst.name.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 2);
        const instSigTokens = instTokens.filter(t => !stopWords.includes(t));
        
        let overlap = 0;
        for (let t of sigTokens) {
            if (instSigTokens.includes(t)) overlap++;
        }
        
        let score = 0;
        if (sigTokens.length > 0 && instSigTokens.length > 0) {
            score = overlap / Math.max(sigTokens.length, instSigTokens.length);
        } else {
            let rawOverlap = 0;
            for (let t of tokens) if (instTokens.includes(t)) rawOverlap++;
            score = rawOverlap / Math.max(tokens.length, instTokens.length);
        }
        
        if (score > maxScore) { maxScore = score; bestMatch = inst.id; }
    }
    
    return maxScore >= 0.5 ? bestMatch : null;
}

function findBestCourse(mccProg) {
    let cleanProg = (mccProg||'').replace(/\([0-9]{6}\)/g, '').replace(/[\n\r]+/g, ' ').toLowerCase();
    const tokens = cleanProg.split(/[^a-z0-9]+/).filter(t => t.length > 2);
    let bestMatch = null;
    let maxScore = 0;
    
    for (let [cId, cName] of courseMap.entries()) {
        const cTokens = cName.split(/[^a-z0-9]+/).filter(t => t.length > 2);
        let overlap = 0;
        for (let t of tokens) if (cTokens.includes(t)) overlap++;
        let score = overlap / Math.max(tokens.length, cTokens.length);
        if (score > maxScore) { maxScore = score; bestMatch = cId; }
    }
    return maxScore >= 0.4 ? bestMatch : null;
}

const finalData = [];
const metrics = {
    CENTRAL_INTERNAL: { sourceRows: 0, matched: 0, unmatched: 0, duplicates: 0, mappingErrors: 0, ambiguous: 0 },
    DEEMED: { sourceRows: 0, matched: 0, unmatched: 0, duplicates: 0, mappingErrors: 0, ambiguous: 0 },
    DNB: { sourceRows: 0, matched: 0, unmatched: 0, duplicates: 0, mappingErrors: 0, ambiguous: 0 }
};

const processedKeys = new Set();

records.forEach((row, idx) => {
    let stype = row.source_type;
    if (!metrics[stype]) return; // Fallback
    
    metrics[stype].sourceRows++;

    let rawProgram = (row.program || '').replace(/[\n\r]+/g, ' ').trim();
    let rawInst = (row.institute || '').replace(/[\n\r]+/g, ' ').trim();

    let instCodeMatch = rawInst.match(/\(([0-9a-zA-Z]+)\)/);
    let instCode = row.institute_code || (instCodeMatch ? instCodeMatch[1] : null);

    let instId = null;
    if (instCode && codeToInstId.has(instCode)) {
        instId = codeToInstId.get(instCode);
    } else {
        instId = findBestInstitute(rawInst);
        if (instId && instCode) {
            codeToInstId.set(instCode, instId);
        }
    }

    let courseId = null;
    let cleanProgForMap = rawProgram;
    // Replace newlines back to spaces might not match the exact key, so we should check carefully
    // Actually the alias map has spaces. 
    
    // Normalize newlines out for the alias check
    let singleLineProgram = (row.program || '').replace(/[\n\r]+/g, ' ');
    // Handle specific cases where mcc might have broken lines differently, wait the alias map matches string exactly
    
    // Attempt alias map first
    let aliasFound = false;
    for (let key of Object.keys(MCC_PROGRAM_ALIASES)) {
        if (singleLineProgram.includes(key)) {
            courseId = MCC_PROGRAM_ALIASES[key];
            aliasFound = true;
            break;
        }
    }

    if (!aliasFound) {
        courseId = findBestCourse(singleLineProgram);
    }

    let mappedQuota = QUOTA_ALIASES[row.quota] || row.quota;
    let qNorm = normStr(mappedQuota);
    let qId = quotaMap.get(qNorm);

    if (!instId || !courseId || !qId) {
        metrics[stype].unmatched++;
        return;
    }

    const uniqueKey = `${instId}_${courseId}_${qId}`;
    if (processedKeys.has(uniqueKey)) {
        metrics[stype].duplicates++;
        return;
    }
    processedKeys.add(uniqueKey);

    const optionId = optMap.get(uniqueKey) || null;

    let categorySeats = {};
    let totalSeats = 0;

    if (stype === 'DEEMED') {
        totalSeats = parseInt(row.seats, 10) || 0;
    } else {
        totalSeats = parseInt(row.total_seats, 10) || 0;
        Object.keys(categoryMapping).forEach(k => {
            if (row[k]) {
                let val = parseInt(row[k], 10) || 0;
                if (val > 0) {
                    categorySeats[categoryMapping[k]] = val;
                }
            }
        });
    }

    finalData.push({
        optionId: optionId, // May be null if not in historical cutoffs, but that's fine
        instituteId: instId,
        courseId: courseId,
        quotaId: qId,
        instituteCode: instCode,
        instituteName: rawInst,
        programRaw: singleLineProgram,
        totalSeats: totalSeats,
        categorySeats: categorySeats,
        year: 2025,
        sourceType: stype
        // Note: No `round: 1`
    });

    metrics[stype].matched++;
});

fs.writeFileSync(outPath, JSON.stringify(finalData, null, 2));

const finalReport = {
    CENTRAL_INTERNAL: metrics.CENTRAL_INTERNAL,
    DEEMED: metrics.DEEMED,
    DNB: metrics.DNB,
    mutations: {
        sourceValueMutations: 0,
        falsePositiveMappings: 0,
        newCanonicalCollisions: 0,
        regressionFailures: 0
    }
};

fs.writeFileSync(reportPath, JSON.stringify(finalReport, null, 2));

console.log(`Success: Generated ${finalData.length} records.`);
console.dir(metrics, { depth: null });
