import assert from 'assert';

// Mock localStorage and document
global.document = {
    addEventListener: () => {},
    getElementById: () => null
};
global.localStorage = {
    store: {},
    getItem(key) { return this.store[key] || null; },
    setItem(key, value) { this.store[key] = value.toString(); },
    clear() { this.store = {}; }
};

// Mock engine for testing
const mockEngine = {
    options: {
        100: { id: 100, institute: { id: 1, name: 'Inst A' }, course: { id: 1, name: 'Course X' } },
        101: { id: 101, institute: { id: 1, name: 'Inst A' }, course: { id: 1, name: 'Course X' } }, // same inst/course
        102: { id: 102, institute: { id: 1, name: 'Inst A' }, course: { id: 2, name: 'Course Y' } }, // diff course
        103: { id: 103, institute: { id: 2, name: 'Inst B' }, course: { id: 1, name: 'Course X' } }, // diff inst
    },
    async getOption(id) {
        if (!this.options[id]) throw new Error("Not found");
        return this.options[id];
    }
};

async function runTests() {
    console.log("--- RUNNING DEDUPLICATION TESTS ---");

    const { state, toggleShortlist, addMultipleToShortlist, getChoiceIdentity, migrateShortlistData } = await import('../js/state.js');

    // Clear state
    state.shortlist = [];

    // Test 1: Adding same institute + course with different categories/quotas results in 1 entry
    const idA1 = getChoiceIdentity(1, 1);
    toggleShortlist(100, idA1);
    toggleShortlist(101, idA1); // Should act as a toggle off if already exists, let's trace:
    // toggleShortlist checks if identity exists. Yes, so it removes it. Wait, toggleShortlist toggles!
    // So if it was in shortlist, it removes it.
    
    // Let's use addMultipleToShortlist instead for adding
    state.shortlist = [];
    addMultipleToShortlist([{ id: 100, identity: idA1 }]);
    addMultipleToShortlist([{ id: 101, identity: idA1 }]);
    
    assert.strictEqual(state.shortlist.length, 1, "Should only have 1 entry for identical institute/course");
    assert.strictEqual(state.shortlist[0].id, 100, "Should keep the first added id");

    // Test 2: Different courses at same institute -> separate entries
    const idA2 = getChoiceIdentity(1, 2);
    addMultipleToShortlist([{ id: 102, identity: idA2 }]);
    assert.strictEqual(state.shortlist.length, 2, "Should have 2 entries for different courses");

    // Test 3: Different institutes with same course -> separate entries
    const idB1 = getChoiceIdentity(2, 1);
    addMultipleToShortlist([{ id: 103, identity: idB1 }]);
    assert.strictEqual(state.shortlist.length, 3, "Should have 3 entries for different institutes");

    // Test 4: Migration logic groups correctly and retains first position
    state.shortlist = [
        { id: 101, tag: 'None', notes: 'Note 2', isFavorite: false }, // variant of Inst 1 Course 1
        { id: 102, tag: 'Target', notes: 'Keep me', isFavorite: false },
        { id: 100, tag: 'Dream', notes: 'Note 1', isFavorite: true }, // variant of Inst 1 Course 1
    ];
    
    await migrateShortlistData(mockEngine);
    
    // After migration, 101 and 100 merge. 101 was first, so it stays.
    assert.strictEqual(state.shortlist.length, 2, "Migration should deduplicate 3 items to 2");
    
    const merged = state.shortlist[0];
    assert.strictEqual(merged.id, 101, "First occurrence should be kept");
    assert.strictEqual(merged.identity, '1_1', "Identity should be set");
    assert.strictEqual(merged.isFavorite, true, "isFavorite should be merged with OR");
    assert.strictEqual(merged.tag, 'Dream', "Dream (1) should override None (0)");
    assert.strictEqual(merged.notes.includes('Note 1') && merged.notes.includes('Note 2'), true, "Notes should be merged");
    
    console.log("✅ All Deduplication tests passed!");
}

runTests().catch(e => {
    console.error(e);
    process.exit(1);
});
