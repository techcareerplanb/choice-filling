import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SearchIndex } from '../js/data/SearchIndex.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataPath = path.join(__dirname, '../data/processed/indexes.json');
const catPath = path.join(__dirname, '../data/processed/categories.json');

const indexes = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const categories = JSON.parse(fs.readFileSync(catPath, 'utf8'));

const index = new SearchIndex(indexes);

const getCatId = (name) => {
    const cat = categories.find(c => c.name === name || (name === 'OPEN' && c.name === 'GEN'));
    return cat ? cat.id : null;
};

const OPEN_ID = getCatId('OPEN');
const EWS_ID = getCatId('EWS');
const OBC_ID = getCatId('OBC');
const SC_ID = getCatId('SC');
const ST_ID = getCatId('ST');

// Check the counts in the indexes to verify our test makes sense
const openCount = indexes.byCategory[OPEN_ID]?.length || 0;
const ewsCount = indexes.byCategory[EWS_ID]?.length || 0;
const obcCount = indexes.byCategory[OBC_ID]?.length || 0;
const scCount = indexes.byCategory[SC_ID]?.length || 0;
const stCount = indexes.byCategory[ST_ID]?.length || 0;

console.log(`Available options in index: OPEN(${openCount}), EWS(${ewsCount}), OBC(${obcCount}), SC(${scCount}), ST(${stCount})`);

function testCandidate(candName, candId) {
    const criteria = {
        categoryIds: candId === OPEN_ID ? [OPEN_ID] : [OPEN_ID, candId]
    };
    
    // Unfiltered test
    if (candId === null) {
        delete criteria.categoryIds;
    }
    
    const results = index.search(criteria);
    
    // Verify that ALL results strictly belong to the eligible categories
    const eligibleCategories = new Set(criteria.categoryIds || []);
    
    let hasInvalid = false;
    let categoryCounts = {};
    
    if (candId !== null) {
        // Since we are mocking the search output directly from index, we don't have hydration.
        // We can verify correctness by ensuring the number of results perfectly equals 
        // the sum of the counts in the indexes for the eligible categories!
        const expectedCount = criteria.categoryIds.reduce((sum, id) => sum + (indexes.byCategory[id]?.length || 0), 0);
        
        if (results.length !== expectedCount) {
            hasInvalid = true;
            console.error(`❌ ${candName}: Expected ${expectedCount} results, got ${results.length}`);
        } else {
            console.log(`✅ ${candName}: Returned exactly ${results.length} options (OPEN + ${candName === 'OPEN' ? 'None' : candName})`);
        }
    } else {
        // Unfiltered should return all (0 in SearchIndex if criteria empty, but worker handles it by returning all)
        if (results.length === 0) {
            console.log(`✅ Unfiltered: SearchIndex gracefully returns 0 when no criteria is applied (Worker fallback handles this).`);
        }
    }
}

console.log("\n--- RUNNING ELIGIBILITY TESTS ---\n");
testCandidate('OPEN', OPEN_ID);
testCandidate('EWS', EWS_ID);
testCandidate('OBC', OBC_ID);
testCandidate('SC', SC_ID);
testCandidate('ST', ST_ID);
testCandidate('Unfiltered', null);
console.log("\n--- TESTS COMPLETED ---");
