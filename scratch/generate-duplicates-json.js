const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '../reports/seat-matrix-duplicates-2025.csv');
const jsonPath = path.join(__dirname, '../reports/seat-matrix-duplicates-2025.json');

const csvContent = fs.readFileSync(csvPath, 'utf8');
const lines = csvContent.split('\n').filter(l => l.trim().length > 0);
const headers = lines[0].split(',').map(h => h.trim());

const records = [];
for (let i = 1; i < lines.length; i++) {
    // Basic CSV parse (assuming no commas inside quotes for this specific file, or properly handling them)
    // The previous script wrote: `"${sourceRowId}","${instCode}","${instName}","${prog}","${quota}","${identity}","${subtype}"\n`
    const line = lines[i];
    const match = line.match(/"([^"]*)"/g);
    if (match) {
        const values = match.map(v => v.replace(/(^"|"$)/g, ''));
        let obj = {};
        headers.forEach((h, idx) => {
            obj[h] = values[idx] || '';
        });
        records.push(obj);
    }
}

fs.writeFileSync(jsonPath, JSON.stringify(records, null, 2));
console.log(`Generated JSON with ${records.length} duplicates.`);
