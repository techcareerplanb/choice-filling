const fs = require('fs');
const readline = require('readline');
const path = require('path');

const csvFile = '/Users/rahulchaudhary/.gemini/antigravity-ide/brain/a663086e-6006-4950-b171-ad062cd0e10a/.user_uploaded/media_1789638749741.csv';
const outDir = path.join(__dirname, '../data/raw');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'mcc_pg_2025_seat_matrix_source.json');

const results = [];
let headers = [];

const rl = readline.createInterface({
    input: fs.createReadStream(csvFile),
    crlfDelay: Infinity
});

let isFirst = true;

// A simple CSV parser to handle quotes
function parseCsvLine(text) {
    let ret = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < text.length; i++) {
        let c = text[i];
        if (c === '"' && inQuote && text[i+1] === '"') {
            cur += '"';
            i++;
        } else if (c === '"') {
            inQuote = !inQuote;
        } else if (c === ',' && !inQuote) {
            ret.push(cur);
            cur = '';
        } else {
            cur += c;
        }
    }
    ret.push(cur);
    return ret;
}

rl.on('line', (line) => {
    if (!line.trim()) return;
    const parts = parseCsvLine(line);
    if (isFirst) {
        headers = parts;
        isFirst = false;
        return;
    }
    const obj = {};
    headers.forEach((h, i) => {
        obj[h] = parts[i];
    });
    results.push(obj);
});

rl.on('close', () => {
    fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
    console.log(`Converted ${results.length} rows to ${outFile}`);
});
