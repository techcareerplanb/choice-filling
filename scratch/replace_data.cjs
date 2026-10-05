const fs = require('fs');
const path = require('path');
const p = 'server/data.js';
let content = fs.readFileSync(p, 'utf8');

// Replace export let dataStore
content = content.replace('export let dataStore = null;', 'export const dataStores = {};');
content = content.replace('export let searchIndex = null;', 'export const searchIndexes = {};');

// Replace initDataLayer
const newInit = `
export async function initDataLayer() {
    console.log("Loading datasets into memory...");
    const files = [
        'metadata', 'institutes', 'courses', 'categories', 'quotas', 'counsellings',
        'options', 'cutoffs', 'financials',
        'seat-matrix-2025', 'seat-matrix-additional-2025', 'indexes'
    ];
    
    const dirs = await fs.promises.readdir(DATA_DIR, { withFileTypes: true });
    let seatMatrices = [];
    
    for (const dir of dirs) {
        if (!dir.isDirectory()) continue;
        const counselling = dir.name;
        if (counselling.includes('mcc_pg')) continue;

        const datasets = {};
        for (const file of files) {
            const filePath = path.join(DATA_DIR, counselling, \`\${file}.json\`);
            if (fs.existsSync(filePath)) {
                try {
                    const raw = await fs.promises.readFile(filePath, 'utf8');
                    datasets[file] = JSON.parse(raw);
                } catch(e) { datasets[file] = []; }
            } else {
                datasets[file] = [];
            }
        }
        
        dataStores[counselling] = new DataStore(datasets);
        searchIndexes[counselling] = new SearchIndex(datasets.indexes || {});
        seatMatrices = seatMatrices.concat(datasets['seat-matrix-2025'] || [], datasets['seat-matrix-additional-2025'] || []);
    }
    
    SeatMatrixProvider.initialize(seatMatrices);
    console.log("Data layer initialized for: " + Object.keys(dataStores).join(', '));
}`;

content = content.replace(/export async function initDataLayer\(\) \{[\s\S]*?console\.log\("Data layer initialized\."\);\n\}/m, newInit);

// Update searchOptions
content = content.replace(/export function searchOptions\(query\) \{/, 'export function searchOptions(counselling, query) {\n    const dataStore = dataStores[counselling];\n    const searchIndex = searchIndexes[counselling];\n');
content = content.replace(/if \(\!dataStore \|\| \!searchIndex\).*?$/m, 'if (!dataStore || !searchIndex) throw new Error("Data layer not initialized for " + counselling);');

// Update getOption
content = content.replace(/export function getOption\(optionId\) \{/, 'export function getOption(counselling, optionId) {\n    const dataStore = dataStores[counselling];\n');
content = content.replace(/if \(\!dataStore\).*?$/m, 'if (!dataStore) throw new Error("Data layer not initialized for " + counselling);');

// Update getOptionsBatch
content = content.replace(/export function getOptionsBatch\(optionIds\) \{/, 'export function getOptionsBatch(counselling, optionIds) {\n    const dataStore = dataStores[counselling];\n');
content = content.replace(/if \(\!dataStore\).*?$/m, 'if (!dataStore) throw new Error("Data layer not initialized for " + counselling);');

// Update getFilterMetadata
content = content.replace(/export function getFilterMetadata\(\) \{/, 'export function getFilterMetadata(counselling) {\n    const dataStore = dataStores[counselling];\n');
content = content.replace(/if \(\!dataStore\).*?$/m, 'if (!dataStore) throw new Error("Data layer not initialized for " + counselling);');

// Update getFilteredIdentities
content = content.replace(/export function getFilteredIdentities\(query\) \{/, 'export function getFilteredIdentities(counselling, query) {\n    const dataStore = dataStores[counselling];\n    const searchIndex = searchIndexes[counselling];\n');
content = content.replace(/if \(\!dataStore \|\| \!searchIndex\).*?$/m, 'if (!dataStore || !searchIndex) throw new Error("Data layer not initialized for " + counselling);');

// One manual check for searchIndex usages inside getFilteredIdentities
// They use dataStore inside these functions, it's captured in the closure

fs.writeFileSync(p, content);
console.log("Replaced data.js");
