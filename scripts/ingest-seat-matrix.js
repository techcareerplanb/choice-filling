const fs = require('fs');
const path = require('path');

const rawDataPath = path.join(__dirname, '../data/raw/mcc_pg_2025_seat_matrix_source.json');
const instPath = path.join(__dirname, '../data/processed/institutes.json');
const optionsPath = path.join(__dirname, '../data/processed/options.json');
const outPath = path.join(__dirname, '../data/processed/seat-matrix-2025.json');
const unmatchedPath = path.join(__dirname, '../data/incoming/unmatched-records.json');

const rawData = JSON.parse(fs.readFileSync(rawDataPath, 'utf8'));
const institutes = JSON.parse(fs.readFileSync(instPath, 'utf8'));
const options = JSON.parse(fs.readFileSync(optionsPath, 'utf8'));
const courses = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/processed/courses.json'), 'utf8'));
const quotas = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/processed/quotas.json'), 'utf8'));
const codeToInstId = new Map([
    ['700109', 35],
    ['700480', 36],
    ['700310', 205], // Seth GS Medical College
    ['700329', 380], // BRD Medical College, Gorakhpur
    ['700388', 410], // Burdwan Medical College, Burdwan
    ['701512', 1935], // Chamrajanagar Institute
    ['700308', 287], // Dr SN Medical College, Jodhpur
    ['700292', 31], // Dr B Borooah Cancer
    ['700302', 209], // Dr Vaishampayan Memorial Medical College, Solapur
    ['700361', 376], // GSVM Medical College, Kanpur
    ['700283', 25], // Gauhati Medical College
    ['700291', 142], // Medical College, Thiruvananthapuram
    ['700386', 366], // Government Medical College, Haldwani
    ['700379', 95], // Indira Gandhi Medical College, Shimla
    ['700323', 261], // Institute of Medical Sciences, BHU
    ['700387', 69], // IPGMER
    ['700482', 343], // Kakatiya Medical College
    ['700403', 172], // Kidwai Memorial
    ['700370', 373], // LLRM Medical College
    ['902829', 3136], // Mahrishi Balark
    ['700417', 102], // MGM Medical College, Jamshedpur
    ['700119', 54], // Maulana Azad Medical College
    ['700392', 405], // Medical College, Kolkata
    ['700537', 418], // Murshidabad Medical College
    ['700400', 413], // Nilratan Sircar
    ['700483', 345], // Osmania Medical College
    ['700368', 76], // Pandit Deendayal Upadhyay
    ['700501', 224], // Bhabha Atomic Research Centre
    ['700471', 5], // SV Medical College, Tirupati
    ['700375', 369], // SN Medical College, Agra
    ['700327', 284], // SMS Medical College
    ['902850', 5328], // Shaheed Nirmal Mahto
    ['700113', 38], // Shri Krishna Medical College, Muzzafarpur
    ['700472', 10], // Siddhartha Medical College
    ['700336', 260], // SCB Medical College, Cuttack
    ['700312', 6225], // Swami Ramanand Teerth
    ['700530', 325], // Government Medical College, Thiruvarur
    ['700123', 51], // University College of Medical Sciences
    ['700377', 401], // Uttar Pradesh University of Medical Sciences
    ['700541', 39], // Vardhman Institute of Medical Sciences
    ['700396', 108], // Vijaynagar Institute of Medical Sciences
    ['700338', 258], // Veer Surendra Sai
]);

const courseMap = new Map();
const quotaMap = new Map();

courses.forEach(c => courseMap.set(c.id, c.name.toLowerCase()));
quotas.forEach(q => quotaMap.set(normStr(q.name), q.id));

const MCC_PROGRAM_ALIASES = {
    "M.S. (E.N.T.)": 68,
    "M.D. (Obst. and Gynae)/MS (Obstetrics and Gynaecology)": 70,
    "M.D.Laboratory Medicine Course": 50
};

// We map options directly by instId + courseId + quotaId
const optMap = new Map();
options.forEach(opt => {
    optMap.set(`${opt.instituteId}_${opt.courseId}_${opt.quotaId}`, opt.id);
});

const categoryMapping = {
    'Open': 1, 'Open PwD': 2, 'General- EWS': 3, 'General- EWS PwD': 4,
    'OBC': 5, 'OBC PwD': 6, 'SC': 7, 'SC PwD': 8, 'ST': 9, 'ST PwD': 10
};

function normStr(str) {
    return (str || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

function findBestInstitute(mccName) {
    const cleanMcc = mccName.replace(/\([0-9]{6}\)/g, '');
    const tokens = cleanMcc.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 2);
    if (tokens.length === 0) return null;
    
    const stopWords = ['medical', 'college', 'hospital', 'institute', 'science', 'sciences', 'research', 'centre'];
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
        
        if (score > maxScore) { 
            maxScore = score; 
            bestMatch = inst.id; 
        }
    }
    
    return maxScore >= 0.5 ? bestMatch : null;
}

function findBestCourse(mccProg) {
    let cleanProg = mccProg.replace(/\([0-9]{6}\)/g, '').toLowerCase();
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
const unmatched = [];
const processedKeys = new Set();

rawData.forEach((row, idx) => {
    let instCodeMatch = row.Institute.match(/\(([0-9a-zA-Z]+)\)/);
    let instCode = instCodeMatch ? instCodeMatch[1] : null;

    let instId = null;
    if (instCode && codeToInstId.has(instCode)) {
        instId = codeToInstId.get(instCode);
    } else {
        instId = findBestInstitute(row.Institute);
        if (instId && instCode) {
            codeToInstId.set(instCode, instId);
        }
    }

    let courseId = null;
    if (MCC_PROGRAM_ALIASES.hasOwnProperty(row.Program)) {
        courseId = MCC_PROGRAM_ALIASES[row.Program];
    } else {
        courseId = findBestCourse(row.Program);
    }
    let qNorm = normStr(row.Quota);
    let qId = quotaMap.get(qNorm);

    // If "All India except Central University" it might just be "All India"
    if (!qId && row.Quota.includes('All India')) {
        qId = quotaMap.get('allindia');
    }
    if (!qId) {
        // Fallback for AIQ
        qId = 1;
    }

    if (!instId || !courseId) {
        unmatched.push({
            reason: 'IDENTITY_MATCH_FAILED',
            row: row,
            instId,
            courseId,
            qId,
            instituteCode: instCode
        });
        return;
    }

    const uniqueKey = `${instId}_${courseId}_${qId}`;
    if (processedKeys.has(uniqueKey)) {
        unmatched.push({
            reason: 'DUPLICATE_IDENTITY',
            row: row,
            instId,
            courseId,
            qId,
            instituteCode: instCode
        });
        return;
    }
    processedKeys.add(uniqueKey);

    const optionId = optMap.get(uniqueKey) || null;

    let totalSeats = parseInt(row.TotalSeats, 10) || 0;
    
    let categorySeats = {};
    Object.keys(categoryMapping).forEach(k => {
        if (row[k]) {
            let val = parseInt(row[k], 10) || 0;
            if (val > 0) {
                categorySeats[categoryMapping[k]] = val;
            }
        }
    });

    finalData.push({
        optionId: optionId,
        instituteId: instId,
        courseId: courseId,
        quotaId: qId,
        instituteCode: instCode,
        instituteName: row.Institute,
        programRaw: row.Program,
        totalSeats: totalSeats,
        categorySeats: categorySeats,
        year: 2025,
        round: 1
    });
});

fs.writeFileSync(outPath, JSON.stringify(finalData, null, 2));
fs.writeFileSync(unmatchedPath, JSON.stringify(unmatched, null, 2));

console.log(`Success: Matched ${finalData.length}, Unmatched ${unmatched.length}.`);
