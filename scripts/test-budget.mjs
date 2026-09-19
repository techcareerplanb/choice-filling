import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { filterOption } from '../js/engine/filterEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock an option to test filterEngine logic
const mockOption1 = { financials: { feeAmount: 800000 } }; // 8 Lakhs
const mockOption2 = { financials: { feeAmount: 1200000 } }; // 12 Lakhs
const mockOption3 = { financials: { feeAmount: null } }; // Null fee (should pass)

const runTest = (budget) => {
    console.log(`\nTesting Budget: ₹${budget / 100000} Lakhs`);
    const criteria = { budget };
    
    console.log(`Option 1 (8L): ${filterOption(mockOption1, criteria) ? 'PASS' : 'FAIL'}`);
    console.log(`Option 2 (12L): ${filterOption(mockOption2, criteria) ? 'PASS' : 'FAIL'}`);
    console.log(`Option 3 (Null): ${filterOption(mockOption3, criteria) ? 'PASS' : 'FAIL'}`);
};

console.log("--- BUDGET FILTER TESTS ---");
runTest(1000000); // 10 Lakhs
runTest(2000000); // 20 Lakhs
