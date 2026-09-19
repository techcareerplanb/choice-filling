import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SearchIndex } from '../js/data/SearchIndex.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataPath = path.join(__dirname, '../data/processed/indexes.json');
const catPath = path.join(__dirname, '../data/processed/categories.json');
const quotaPath = path.join(__dirname, '../data/processed/quotas.json');
const optionsPath = path.join(__dirname, '../data/processed/options.json');

const indexes = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const categories = JSON.parse(fs.readFileSync(catPath, 'utf8'));
const quotas = JSON.parse(fs.readFileSync(quotaPath, 'utf8'));
const options = JSON.parse(fs.readFileSync(optionsPath, 'utf8'));

const index = new SearchIndex(indexes);

const getCatId = (name) => {
    const cat = categories.find(c => c.name === name || (name === 'OPEN' && c.name === 'GEN'));
    return cat ? cat.id : null;
};

const getQuotaId = (shortName) => {
    const quota = quotas.find(q => q.short_name === shortName || q.name.includes(shortName));
    return quota ? quota.id : null;
};

const OPEN_ID = getCatId('OPEN');
const OBC_ID = getCatId('OBC');
const SC_ID = getCatId('SC');

const AIQ_ID = getQuotaId('AIQ');
const DNB_ID = getQuotaId('DNB');
const DU_ID = getQuotaId('DU');
const NRI_ID = getQuotaId('NRI');

// Create a lookup for verifying option details
const optionsMap = new Map();
options.forEach(opt => optionsMap.set(opt.id, opt));

function assert(condition, message) {
    if (!condition) {
        console.error(`❌ FAIL: ${message}`);
        process.exit(1); // Fail fast
    }
}

function verifyResults(results, allowedCategories, allowedQuotas, testName) {
    for (const id of results) {
        const opt = optionsMap.get(id);
        if (allowedCategories) {
            assert(allowedCategories.includes(opt.categoryId), `${testName}: Result ${id} has category ${opt.categoryId}, expected one of ${allowedCategories}`);
        }
        if (allowedQuotas) {
            assert(allowedQuotas.includes(opt.quotaId), `${testName}: Result ${id} has quota ${opt.quotaId}, expected one of ${allowedQuotas}`);
        }
    }
}

console.log("\n--- RUNNING QUOTA FILTER TESTS ---\n");

// Test 1. No quota selected → all quotas remain eligible.
console.log("Test 1: No quota selected");
const res1 = index.search({});
assert(res1.length === 0, "Empty criteria should return empty from index, fallback handled by worker.");
console.log("✅ Passed: No quota selected returns empty (worker fetches all)");

// Test 2. AIQ selected → only AIQ options.
console.log("Test 2: AIQ selected");
const res2 = index.search({ quotaIds: [AIQ_ID] });
assert(res2.length > 0, "Should return AIQ options");
verifyResults(res2, null, [AIQ_ID], "Test 2");
assert(res2.length === indexes.byQuota[AIQ_ID].length, "Count matches exact AIQ index length");
console.log(`✅ Passed: AIQ only returned ${res2.length} results.`);

// Test 3. AIQ + DNB selected → AIQ or DNB options only.
console.log("Test 3: AIQ + DNB selected");
const res3 = index.search({ quotaIds: [AIQ_ID, DNB_ID] });
assert(res3.length > 0, "Should return AIQ/DNB options");
verifyResults(res3, null, [AIQ_ID, DNB_ID], "Test 3");
const expectedAiqDnb = (indexes.byQuota[AIQ_ID]?.length || 0) + (indexes.byQuota[DNB_ID]?.length || 0);
assert(res3.length === expectedAiqDnb, "Count matches AIQ + DNB exact index length");
console.log(`✅ Passed: AIQ + DNB returned ${res3.length} results.`);

// Test 4. OBC + AIQ → OPEN/OBC AIQ options only.
console.log("Test 4: OBC + AIQ");
const res4 = index.search({ categoryIds: [OPEN_ID, OBC_ID], quotaIds: [AIQ_ID] });
assert(res4.length > 0, "Should return OBC AIQ options");
verifyResults(res4, [OPEN_ID, OBC_ID], [AIQ_ID], "Test 4");
console.log(`✅ Passed: OBC + AIQ returned ${res4.length} results.`);

// Test 5. GN + DU → OPEN DU options only.
console.log("Test 5: GN + DU");
const res5 = index.search({ categoryIds: [OPEN_ID], quotaIds: [DU_ID] });
assert(res5.length > 0, "Should return GN DU options");
verifyResults(res5, [OPEN_ID], [DU_ID], "Test 5");
console.log(`✅ Passed: GN + DU returned ${res5.length} results.`);

// Test 6. SC + NRI → OPEN/SC NRI options only.
console.log("Test 6: SC + NRI");
const res6 = index.search({ categoryIds: [OPEN_ID, SC_ID], quotaIds: [NRI_ID] });
verifyResults(res6, [OPEN_ID, SC_ID], [NRI_ID], "Test 6");
console.log(`✅ Passed: SC + NRI returned ${res6.length} results.`);

// Test 7 & 8: Invalid/unknown quota IDs do not return unrelated results.
console.log("Test 7 & 8: Invalid Quota ID");
const res7 = index.search({ quotaIds: [9999999] });
assert(res7.length === 0, "Invalid quota ID should return 0 results");
console.log(`✅ Passed: Invalid Quota ID returned 0 results.`);

console.log("\n--- ALL TESTS PASSED ---");
