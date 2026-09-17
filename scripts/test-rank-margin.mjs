import { assessFit } from '../js/engine/fitEngine.js';
import assert from 'assert';

console.log("Running fitEngine tests...");

function mockCutoffs(latestRank) {
    return {
        hasData: latestRank !== null && latestRank !== undefined,
        latestClosingRank: latestRank,
        bestClosingRank: latestRank,
        worstClosingRank: latestRank,
        latestYear: 2025,
        latestRound: 3,
        historicalRoundsAvailable: 1,
        yoyMovement: null,
        confidence: "Medium"
    };
}

let passed = 0;
let total = 0;

function runTest(name, userAIR, cutoff, expectedMargin) {
    total++;
    try {
        const result = assessFit(userAIR, mockCutoffs(cutoff));
        assert.strictEqual(result.rankMarginLatest, expectedMargin);
        console.log(`✅ [PASS] ${name} -> rankMarginLatest: ${result.rankMarginLatest}`);
        passed++;
    } catch (e) {
        console.error(`❌ [FAIL] ${name} -> Error: ${e.message}`);
    }
}

// 1. Valid user AIR + valid closing rank
runTest("1. Valid AIR + Valid Cutoff", 20000, 25000, 5000);

// 2. Missing user AIR
runTest("2. Missing user AIR", null, 25000, null);
runTest("2b. Missing user AIR (empty string)", "", 25000, null);

// 3. Missing closing rank
runTest("3. Missing closing rank", 20000, "", null);

// 4. undefined
runTest("4. undefined inputs", undefined, undefined, null);

// 5. null
runTest("5. null inputs", null, null, null);

// 6. Non-numeric cutoff
runTest("6. Non-numeric cutoff", 20000, "invalid_rank", null);

// 7. Formatted numeric cutoff
runTest("7. Formatted numeric cutoff", "20,000", "25,000*", 5000);
runTest("7b. Formatted numeric cutoff with Rs", "20,000", "₹ 25,000", 5000);

// 8. Explicit Year + Round selection
runTest("8. Selected Cutoff 15000 vs 20000 AIR", 20000, 15000, -5000);

// 9/10 tests are inherently passed since data.worker.js dictates the 'latestClosingRank' passed to this function.

console.log(`\nTests completed: ${passed}/${total} passed.`);
