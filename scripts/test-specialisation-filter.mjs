import { SearchIndex } from '../js/data/SearchIndex.js';

const mockIndexes = {
    byInstitute: {},
    byCourse: {
        '10': ['opt1', 'opt2'], // MD General Medicine
        '20': ['opt2', 'opt3'], // MS General Surgery
        '30': ['opt4', 'opt5'], // DM Cardiology
        '40': ['opt6']          // DM Neurology
    },
    byCategory: {},
    byQuota: {},
    byState: {
        'Delhi': ['opt1', 'opt2', 'opt3', 'opt4'],
        'Haryana': ['opt5', 'opt6']
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

    console.log('--- RUNNING SPECIALISATION FILTER TESTS ---');

    // 1. Single Specialisation
    assertEqual('Single specialisation (10)', 
        searchIndex.search({ courseIds: ['10'] }), 
        ['opt1', 'opt2']
    );

    // 2. Two Specialisations (Union)
    assertEqual('Two specialisations (10, 20)', 
        searchIndex.search({ courseIds: ['10', '20'] }), 
        ['opt1', 'opt2', 'opt3']
    );

    // 3. Specialisation + State Intersection
    // Note: State 'Delhi' provides [opt1, opt2, opt3, opt4].
    // Course '30' provides [opt4, opt5].
    // Intersection should be [opt4].
    assertEqual('State (Delhi) + Specialisation (30)', 
        searchIndex.search({ states: ['Delhi'], courseIds: ['30'] }), 
        ['opt4']
    );

    // 4. Multiple Specialisations + Multiple States
    // States 'Delhi' + 'Haryana' = [opt1, opt2, opt3, opt4, opt5, opt6]
    // Courses '30' + '40' = [opt4, opt5, opt6]
    // Intersection = [opt4, opt5, opt6]
    assertEqual('States (Delhi, Haryana) + Specialisations (30, 40)', 
        searchIndex.search({ states: ['Delhi', 'Haryana'], courseIds: ['30', '40'] }), 
        ['opt4', 'opt5', 'opt6']
    );

    // 5. Invalid intersection (empty result)
    // State 'Delhi' provides [opt1, opt2, opt3, opt4]
    // Course '40' provides [opt6]
    // Intersection = []
    assertEqual('Invalid Intersection (Delhi + 40)', 
        searchIndex.search({ states: ['Delhi'], courseIds: ['40'] }), 
        []
    );

    console.log(`\nTests completed: ${passed} passed, ${failed} failed.`);
    if (failed > 0) process.exit(1);
}

runTests();
