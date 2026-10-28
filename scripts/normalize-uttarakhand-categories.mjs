import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawPath = path.join(__dirname, '../data/raw/Uttarakhand.json');
const backupDir = path.join(__dirname, '../data/backups');

console.log('Starting Uttarakhand category normalization...');

if (!fs.existsSync(rawPath)) {
    console.error(`File not found: ${rawPath}`);
    process.exit(1);
}

const rawData = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
console.log(`Loaded ${rawData.length} records from ${rawPath}`);

// 1. Create Backup
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
}
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(backupDir, `Uttarakhand-${timestamp}.json`);
fs.writeFileSync(backupPath, JSON.stringify(rawData, null, 2), 'utf8');
console.log(`Backup saved to ${backupPath}`);

// Helper to compute unique composite identity
function getCompositeKey(r, catOverride = null) {
    const instId = r.institute?.id || r.institute?.name || 'UNKN';
    const courseId = r.course?.id || r.course?.name || 'UNKN';
    const quotaId = r.quota?.id || r.quota?.name || 'UNKN';
    const cat = catOverride || r.category || 'UNKN';
    const counsId = r.counselling?.id || r.counselling?.name || 'UNKN';
    return `${instId}|${courseId}|${quotaId}|${cat}|${counsId}`;
}

const urOpenRecords = [];
const otherRecords = [];

rawData.forEach(r => {
    if (r.category === 'UR-Open') {
        urOpenRecords.push(r);
    } else {
        otherRecords.push(r);
    }
});

console.log(`Identified ${urOpenRecords.length} 'UR-Open' records and ${otherRecords.length} other records.`);

// Build index of other records
const recordMap = new Map();
otherRecords.forEach(r => {
    const key = getCompositeKey(r);
    recordMap.set(key, r);
});

let mergedCount = 0;
let updatedCount = 0;

urOpenRecords.forEach(source => {
    const targetKey = getCompositeKey(source, 'UR-OPEN');
    const target = recordMap.get(targetKey);

    if (target) {
        // Merge cutoffs
        Object.keys(source).forEach(k => {
            if (k.startsWith('cr_')) {
                if (!target[k]) {
                    target[k] = source[k];
                } else {
                    console.warn(`[WARNING] Overlapping cutoff field ${k} between source #${source.id} and target #${target.id}`);
                }
            }
        });

        // Merge any non-empty metadata if missing in target
        ['fee', 'stipend_year_1', 'bond_years', 'bond_penalty', 'beds'].forEach(field => {
            if ((!target[field] || target[field] === '-' || target[field] === '') && source[field]) {
                target[field] = source[field];
            }
        });

        mergedCount++;
    } else {
        // No existing UR-OPEN record: normalize category to UR-OPEN
        source.category = 'UR-OPEN';
        otherRecords.push(source);
        recordMap.set(targetKey, source);
        updatedCount++;
    }
});

console.log(`Merged ${mergedCount} 'UR-Open' records into existing 'UR-OPEN' options.`);
console.log(`Updated ${updatedCount} standalone 'UR-Open' records to 'UR-OPEN'.`);
console.log(`Final records count: ${otherRecords.length}`);

// Validation checks
const finalCategories = new Set(otherRecords.map(r => r.category));
console.log(`Distinct categories count: ${finalCategories.size}`);
console.log('Categories:', Array.from(finalCategories).sort());

if (finalCategories.has('UR-Open')) {
    console.error('ERROR: UR-Open still present in records!');
    process.exit(1);
}

// Check composite identity uniqueness
const seenKeys = new Set();
let dupes = 0;
otherRecords.forEach(r => {
    const key = getCompositeKey(r);
    if (seenKeys.has(key)) {
        console.error(`ERROR: Duplicate composite identity found: ${key} (Option ID: ${r.id})`);
        dupes++;
    }
    seenKeys.add(key);
});

if (dupes > 0) {
    console.error(`ERROR: ${dupes} duplicate composite identities found!`);
    process.exit(1);
}

// Save updated raw data
fs.writeFileSync(rawPath, JSON.stringify(otherRecords, null, 2), 'utf8');
console.log(`Successfully saved normalized records to ${rawPath}`);

