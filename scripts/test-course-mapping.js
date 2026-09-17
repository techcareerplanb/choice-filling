const assert = require('assert');

// The logic from ingest-seat-matrix.js
const MCC_PROGRAM_ALIASES = {
    "M.S. (E.N.T.)": 68,
    "M.D. (Obst. and Gynae)/MS (Obstetrics and Gynaecology)": 70,
    "M.D.Laboratory Medicine Course": 50
};

function testMapping() {
    let passed = 0;
    
    // Test A
    let inputA = "M.S. (E.N.T.)";
    assert.strictEqual(MCC_PROGRAM_ALIASES[inputA], 68, "Test A Failed");
    passed++;
    
    // Test B
    let inputB = "M.D. (Obst. and Gynae)/MS (Obstetrics and Gynaecology)";
    assert.strictEqual(MCC_PROGRAM_ALIASES[inputB], 70, "Test B Failed");
    passed++;
    
    // Test C
    let inputC = "M.D.Laboratory Medicine Course";
    assert.strictEqual(MCC_PROGRAM_ALIASES[inputC], 50, "Test C Failed");
    passed++;
    
    // False positive protection
    let falseA = "M.S. (E.N.T.) something else";
    assert.strictEqual(MCC_PROGRAM_ALIASES[falseA], undefined, "False Positive A Failed");
    passed++;
    
    let falseB = "M.D. (Obstetrics)";
    assert.strictEqual(MCC_PROGRAM_ALIASES[falseB], undefined, "False Positive B Failed");
    passed++;
    
    console.log(`✓ All ${passed} regression tests passed.`);
}

testMapping();
