const fs = require('fs');
const path = require('path');
const PDFParser = require("pdf2json");

const INST_FILE = path.join(__dirname, '../data/processed/institutes.json');
const COURSE_FILE = path.join(__dirname, '../data/processed/courses.json');
const OPT_FILE = path.join(__dirname, '../data/processed/options.json');
const QUOTA_FILE = path.join(__dirname, '../data/processed/quotas.json');
const CAT_FILE = path.join(__dirname, '../data/processed/categories.json');

const OUT_FILE = path.join(__dirname, '../data/processed/seat-matrix-2025.json');
const META_FILE = path.join(__dirname, '../data/processed/seat-matrix-metadata.json');
const UNMATCHED_FILE = path.join(__dirname, '../data/incoming/unmatched-records.json');

const institutes = JSON.parse(fs.readFileSync(INST_FILE, 'utf8'));
const courses = JSON.parse(fs.readFileSync(COURSE_FILE, 'utf8'));
const options = JSON.parse(fs.readFileSync(OPT_FILE, 'utf8'));
const quotas = JSON.parse(fs.readFileSync(QUOTA_FILE, 'utf8'));
const categories = JSON.parse(fs.readFileSync(CAT_FILE, 'utf8'));

const normStr = str => str.toLowerCase().replace(/[^a-z0-9]/g, '');

const instMap = new Map();
const courseMap = new Map();
const quotaMap = new Map();
const catMap = new Map();
const codeToInstId = new Map([
    ['700109', 35], // Nalanda
    ['700480', 36]  // Patna
]); // MCC Code -> instId

const categoryMapping = {
    'Open': 'GEN', 'Open PwD': 'GEN-PwD', 'General-EWS': 'EWS', 'General-EWS PwD': 'EWS-PwD',
    'OBC': 'OBC', 'OBC PwD': 'OBC-PwD', 'SC': 'SC', 'SC PwD': 'SC-PwD', 'ST': 'ST', 'ST PwD': 'ST-PwD'
};
const pdfCatKeys = ['Open', 'Open PwD', 'General-EWS', 'General-EWS PwD', 'OBC', 'OBC PwD', 'SC', 'SC PwD', 'ST', 'ST PwD'];

categories.forEach(c => catMap.set(c.name, c.id));
quotas.forEach(q => quotaMap.set(normStr(q.name), q.id));

function findBestInstitute(mccName) {
    const cleanMcc = mccName.replace(/\([0-9]{6}\)/g, '');
    const tokens = cleanMcc.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 2);
    if (tokens.length === 0) return null;
    
    // Stop words that carry low differentiating weight
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
            // fallback if both only have generic words (rare)
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
    for (let c of courses) {
        const cTokens = c.name.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 2);
        let overlap = 0;
        for (let t of tokens) if (cTokens.includes(t)) overlap++;
        let score = overlap / Math.max(tokens.length, cTokens.length);
        if (score > maxScore) { maxScore = score; bestMatch = c.id; }
    }
    return maxScore >= 0.4 ? bestMatch : null;
}

let pdfParser = new PDFParser();
pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError));
pdfParser.on("pdfParser_dataReady", pdfData => {
    let rawRows = [];
    
    pdfData.Pages.forEach((page, pageNum) => {
        const quotaTexts = page.Texts.filter(t => {
            const text = decodeURIComponent(t.R[0].T).trim();
            return t.x > 30 && t.x < 33 && text.length > 2 && text !== "Quota";
        });
        
        const baselines = quotaTexts.map(t => t.y).sort((a, b) => a - b);
        if (baselines.length === 0) return;
        
        const headerTexts = page.Texts.filter(t => decodeURIComponent(t.R[0].T).trim() === "Institute Type");
        const headerY = headerTexts.length > 0 ? headerTexts[0].y : 0;
        
        for (let i = 0; i < baselines.length; i++) {
            let yBase = baselines[i];
            let minY = i === 0 ? (headerY > 0 ? (headerY + yBase) / 2 : yBase - 1.0) : (baselines[i-1] + yBase) / 2;
            let maxY = i === baselines.length - 1 ? yBase + 1.5 : (yBase + baselines[i+1]) / 2;
            
            let rowTexts = page.Texts.filter(t => t.y > minY && t.y < maxY);
            
            let combinedText = [];
            let numbers = [];
            let quotaStr = "";
            
            rowTexts.sort((a, b) => a.y - b.y || a.x - b.x).forEach(t => {
                let text = decodeURIComponent(t.R[0].T).trim();
                if (!text) return;
                
                if (t.x >= 7.5 && t.x < 30.5) {
                    combinedText.push({x: t.x, y: t.y, text: text});
                } else if (t.x >= 30.5 && t.x < 33) {
                    quotaStr += (quotaStr ? " " : "") + text;
                } else if (t.x >= 33) {
                    numbers.push({ x: t.x, val: text });
                }
            });
            
            let fullStr = combinedText.map(t => t.text).join(" ");
            let progRegex = /(M\.D\.|M\.S\.|DNB|NBEMS|Diploma|MDS|Post MBBS)\s*(.*)/i;
            let match = fullStr.match(progRegex);
            
            let instArr = fullStr;
            let progArr = "";
            
            if (match) {
                instArr = fullStr.substring(0, match.index).trim();
                progArr = fullStr.substring(match.index).trim();
            }
            
            numbers.sort((a, b) => a.x - b.x);
            
            rawRows.push({
                institute: instArr,
                program: progArr,
                quota: quotaStr,
                seats: numbers.map(n => n.val)
            });
        }
    });

    const processedSeats = [];
    const unmatched = [];
    const seenIdentities = new Set();
    let matchedRecords = 0;
    
    for (let row of rawRows) {
        if (row.seats.length !== 11) continue;
        
        let instCodeMatch = row.institute.match(/\(([0-9]{6})\)/) || row.program.match(/\(([0-9]{6})\)/);
        let instituteCode = instCodeMatch ? instCodeMatch[1] : null;
        
        let instId = null;
        if (instituteCode && codeToInstId.has(instituteCode)) {
            instId = codeToInstId.get(instituteCode);
        } else {
            instId = findBestInstitute(row.institute);
            if (instId && instituteCode) {
                codeToInstId.set(instituteCode, instId);
            }
        }
        
        let courseId = findBestCourse(row.program);
        
        let qStr = normStr(row.quota);
        if (qStr === 'allindia') qStr = 'aiq';
        if (qStr === 'deemedpaidseatsquota') qStr = 'mgtpaid';
        let qId = quotaMap.get(qStr);
        if (!qId && qStr.includes('deemed')) qId = quotaMap.get('mgtpaid');
        
        if (!instId || !courseId || !qId) {
            unmatched.push({ reason: 'IDENTITY_MATCH_FAILED', row, instId, courseId, qId, instituteCode });
            continue;
        }
        
        const identity = `${instId}|${courseId}|${qId}`;
        if (seenIdentities.has(identity)) {
            unmatched.push({ reason: 'DUPLICATE_IDENTITY', row, identity });
            continue;
        }
        
        const seatCounts = {};
        let totalCols = 0;
        for (let i=0; i<10; i++) {
            let val = parseInt(row.seats[i], 10) || 0;
            let catId = catMap.get(categoryMapping[pdfCatKeys[i]]);
            if (catId && val > 0) {
                seatCounts[catId] = val;
            }
            totalCols += val;
        }
        let totalSeats = parseInt(row.seats[10], 10) || 0;
        
        if (totalCols !== totalSeats) {
            unmatched.push({ reason: 'SEAT_RECONCILIATION_FAILED', row, totalCols, totalSeats });
            continue;
        }
        
        let option = options.find(o => o.instituteId === instId && o.courseId === courseId && o.quotaId === qId);
        
        seenIdentities.add(identity);
        matchedRecords++;
        processedSeats.push({
            optionId: option ? option.id : null,
            instituteId: instId,
            courseId: courseId,
            quotaId: qId,
            instituteCode: instituteCode,
            instituteName: row.institute,
            programRaw: row.program,
            totalSeats: totalSeats,
            categorySeats: seatCounts,
            year: 2025,
            round: 1
        });
    }
    
    fs.writeFileSync(OUT_FILE, JSON.stringify(processedSeats));
    fs.writeFileSync(UNMATCHED_FILE, JSON.stringify(unmatched, null, 2));
    
    const meta = {
        datasetType: "seat_matrix",
        datasetVersion: "2025-mcc-aiq",
        year: 2025,
        round: 1,
        source: "MCC",
        sourceFile: "mcc-seat-matrix-pg-2025-Round-1.pdf",
        recordCount: processedSeats.length + unmatched.length,
        matchedRecords: matchedRecords,
        unmatchedRecords: unmatched.length,
        generatedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2));
    console.log(`Success: Matched ${matchedRecords}, Unmatched ${unmatched.length}. Check unmatched-records.json`);
});

pdfParser.loadPDF("data/incoming/mcc-seat-matrix-pg-2025-Round-1.pdf");
