import { SearchIndex } from '../js/data/SearchIndex.js';

const mockIndexes = {
    byInstitute: {},
    byCourse: {},
    byCategory: {},
    byQuota: {},
    byState: {
        'Delhi': ['opt1', 'opt2'],
        'Haryana': ['opt2', 'opt3'],
        'Rajasthan': ['opt4', 'opt5'],
        'Unknown': ['opt6']
    }
};

const searchIndex = new SearchIndex(mockIndexes);

function runTests() {
    let passed = 0;
    let failed = 0;

    const assertEqual = (name, actual, expected) => {
        const actualSorted = [...actual].sort();
        const expectedSorted = [...expected].sort();
        const isMatch = JSON.stringify(actualSorted) === JSON.stringify(expectedSorted);
        if (isMatch) {
            console.log(`✅ PASS: ${name}`);
            passed++;
        } else {
            console.error(`❌ FAIL: ${name}`);
            console.error(`   Expected: ${expectedSorted}`);
            console.error(`   Actual:   ${actualSorted}`);
            failed++;
        }
    };

    console.log('--- RUNNING STATE FILTER TESTS ---');

    // 1. Single State
    assertEqual('Single state (Delhi)', 
        searchIndex.search({ states: ['Delhi'] }), 
        ['opt1', 'opt2']
    );

    // 2. Two States (Union)
    assertEqual('Two states (Delhi, Haryana)', 
        searchIndex.search({ states: ['Delhi', 'Haryana'] }), 
        ['opt1', 'opt2', 'opt3']
    );

    // 3. Three States (Union)
    assertEqual('Three states', 
        searchIndex.search({ states: ['Delhi', 'Haryana', 'Rajasthan'] }), 
        ['opt1', 'opt2', 'opt3', 'opt4', 'opt5']
    );

    // 4. Missing state in index
    assertEqual('Unknown state', 
        searchIndex.search({ states: ['Punjab'] }), 
        []
    );

    // 5. Mixed valid/invalid states
    assertEqual('Mixed valid/invalid', 
        searchIndex.search({ states: ['Delhi', 'Punjab'] }), 
        ['opt1', 'opt2']
    );

    // 6. No states provided (should return empty array if no criteria are passed, per existing behavior)
    assertEqual('No criteria provided', 
        searchIndex.search({ }), 
        []
    );

    console.log(`\nTests completed: ${passed} passed, ${failed} failed.`);
    if (failed > 0) process.exit(1);
}

runTests();
