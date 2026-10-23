import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RAW_DIR = path.join(__dirname, '../data/raw');
const PROCESSED_DIR = path.join(__dirname, '../data/processed');
const PREPROCESS_SCRIPT = path.join(__dirname, 'preprocess.js');

// Support running on all states or specific state files passed as arguments
const args = process.argv.slice(2);
let stateFiles = [];

if (args.length > 0) {
    stateFiles = args.map(a => a.endsWith('.json') ? a : `${a}.json`);
} else {
    stateFiles = fs.readdirSync(RAW_DIR).filter(f => 
        f.endsWith('.json') && 
        !f.startsWith('All-India') && 
        !f.includes('seat_matrix')
    );
}

console.log(`Processing ${stateFiles.length} state dataset(s)...`);

for (const file of stateFiles) {
    const stateName = path.basename(file, '.json');
    const inputPath = path.join(RAW_DIR, file);
    const outDir = path.join(PROCESSED_DIR, stateName);
    
    if (!fs.existsSync(inputPath)) {
        console.error(`File not found: ${inputPath}`);
        continue;
    }
    
    console.log(`\n========================================`);
    console.log(`Processing State: ${stateName}`);
    console.log(`Input:  ${inputPath}`);
    console.log(`Output: ${outDir}`);
    console.log(`========================================`);
    
    try {
        execFileSync(process.execPath, [PREPROCESS_SCRIPT], {
            env: {
                ...process.env,
                INPUT_PATH: inputPath,
                OUT_DIR: outDir
            },
            stdio: 'inherit'
        });
    } catch (err) {
        console.error(`Error processing ${stateName}:`, err.message);
    }
}

console.log(`\nAll specified state datasets processed successfully.`);
