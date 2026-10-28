import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const BACKUP_DIR = path.join(ROOT_DIR, 'data', 'backups');
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const CANONICAL_INST = {
    id: 3424,
    name: "Government Medical College, Bharatpur",
    short_name: "Govt Med Coll, Bharatpur",
    logo_url: null,
    district: null
};

const REDUNDANT_RAJ_OPTIONS = new Set([880183, 880184, 880185]);

const SEAT_MATRIX_REMAP = {
    880183: 401095, // DCH
    880184: 504226, // Diploma Ophthalmology
    880185: 401141  // Diploma ENT
};

function backupFile(filePath, backupName) {
    if (fs.existsSync(filePath)) {
        const dest = path.join(BACKUP_DIR, backupName);
        fs.copyFileSync(filePath, dest);
        console.log(`Backed up ${filePath} -> ${dest}`);
    }
}

// 1. Process Rajasthan
console.log('=== Step 1: Processing Rajasthan.json ===');
const rajRawPath = path.join(ROOT_DIR, 'data', 'raw', 'Rajasthan.json');
backupFile(rajRawPath, 'Rajasthan.json.pre-bharatpur-merge.bak');

const rajRaw = JSON.parse(fs.readFileSync(rajRawPath, 'utf8'));
const rajInitialCount = rajRaw.length;

// Filter out redundant shell options
const rajFiltered = rajRaw.filter(c => !REDUNDANT_RAJ_OPTIONS.has(c.id));
let rajMergedCount = 0;

const rajUpdated = rajFiltered.map(c => {
    if (c.institute && c.institute.id === 1439) {
        rajMergedCount++;
        return {
            ...c,
            institute: { ...CANONICAL_INST }
        };
    }
    return c;
});

console.log(`Rajasthan: Initial ${rajInitialCount}, Removed ${rajInitialCount - rajFiltered.length} redundant, Merged ${rajMergedCount} from 1439 to 3424. Final: ${rajUpdated.length}`);
fs.writeFileSync(rajRawPath, JSON.stringify(rajUpdated, null, 2), 'utf8');

// 2. Process All-India
console.log('\n=== Step 2: Processing All-India.json ===');
const aiPaths = [
    path.join(ROOT_DIR, 'data', 'raw', 'All-India.json'),
    path.join(ROOT_DIR, 'data', 'All-India.json')
];

for (const aiPath of aiPaths) {
    if (fs.existsSync(aiPath)) {
        backupFile(aiPath, `${path.basename(aiPath)}.pre-bharatpur-merge.bak`);
        const aiRaw = JSON.parse(fs.readFileSync(aiPath, 'utf8'));
        let aiMergedCount = 0;
        const aiUpdated = aiRaw.map(c => {
            if (c.institute && c.institute.id === 1439) {
                aiMergedCount++;
                return {
                    ...c,
                    institute: { ...CANONICAL_INST }
                };
            }
            return c;
        });
        console.log(`${aiPath}: Merged ${aiMergedCount} options from 1439 to 3424.`);
        fs.writeFileSync(aiPath, JSON.stringify(aiUpdated, null, 2), 'utf8');
    }
}

// 3. Update Seat Matrix Files
console.log('\n=== Step 3: Updating 2026 Seat Matrices ===');
const smPaths = [
    path.join(ROOT_DIR, 'data', 'processed', 'Rajasthan', 'seat-matrix-2026.json'),
    path.join(ROOT_DIR, 'data', 'processed', 'seat-matrix-2026.json')
];

for (const smPath of smPaths) {
    if (fs.existsSync(smPath)) {
        backupFile(smPath, `${path.basename(smPath)}.${path.basename(path.dirname(smPath))}.pre-merge.bak`);
        const smData = JSON.parse(fs.readFileSync(smPath, 'utf8'));
        let remappedCount = 0;
        const smUpdated = smData.map(item => {
            if (SEAT_MATRIX_REMAP[item.optionId]) {
                remappedCount++;
                return {
                    ...item,
                    optionId: SEAT_MATRIX_REMAP[item.optionId]
                };
            }
            return item;
        });
        console.log(`${smPath}: Remapped ${remappedCount} seat matrix entries.`);
        fs.writeFileSync(smPath, JSON.stringify(smUpdated, null, 2), 'utf8');
    }
}

// 4. Rebuild Preprocessed Catalogs
console.log('\n=== Step 4: Rebuilding Preprocessed Catalogs ===');
console.log('Running preprocess-states.js for Rajasthan...');
execFileSync(process.execPath, [path.join(ROOT_DIR, 'scripts', 'preprocess-states.js'), 'Rajasthan'], {
    stdio: 'inherit',
    cwd: ROOT_DIR
});

console.log('\nRunning preprocess.js for All-India & Root processed...');
execFileSync(process.execPath, [path.join(ROOT_DIR, 'scripts', 'preprocess.js')], {
    stdio: 'inherit',
    cwd: ROOT_DIR
});

console.log('\n=== GMC Bharatpur Merge Completed Successfully ===');
