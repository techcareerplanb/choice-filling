import { SearchIndex } from '../js/data/SearchIndex.js';

const mockIndexes = {
    byInstitute: {
        '101': ['opt1', 'opt2'],
        '102': ['opt3'],
        '103': ['opt4', 'opt5'],
        '104': ['opt6']
    },
    byCourse: {},
    byCategory: {},
    byQuota: {},
    byState: {
        'Delhi': ['opt1', 'opt2', 'opt3'], // Inst 101, 102
        'Haryana': ['opt4', 'opt5']        // Inst 103
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

    console.log('--- RUNNING COLLEGE FILTER TESTS ---');

    // 1. Single College
    assertEqual('Single college (101)', 
        searchIndex.search({ instituteIds: ['101'] }), 
        ['opt1', 'opt2']
    );

    // 2. Two Colleges (Union)
    assertEqual('Two colleges (101, 102)', 
        searchIndex.search({ instituteIds: ['101', '102'] }), 
        ['opt1', 'opt2', 'opt3']
    );

    // 3. College + State Intersection
    // Note: State 'Delhi' provides [opt1, opt2, opt3].
    // College '101' provides [opt1, opt2].
    // Intersection should be [opt1, opt2].
    assertEqual('State (Delhi) + College (101)', 
        searchIndex.search({ states: ['Delhi'], instituteIds: ['101'] }), 
        ['opt1', 'opt2']
    );

    // 4. Invalid State + College intersection
    // State 'Delhi' provides [opt1, opt2, opt3].
    // College '103' provides [opt4, opt5].
    // Intersection should be empty.
    assertEqual('State (Delhi) + College (103 - outside state)', 
        searchIndex.search({ states: ['Delhi'], instituteIds: ['103'] }), 
        []
    );

    console.log(`\nTests completed: ${passed} passed, ${failed} failed.`);
    if (failed > 0) process.exit(1);
}

runTests();
