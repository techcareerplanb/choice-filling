import fs from 'fs';

async function runTests() {
    console.log("Testing Pagination...");
    // 1. Initial page
    let res = await fetch('http://localhost:3000/api/options?pageSize=2');
    let data = await res.json();
    if (data.items.length > 2) throw new Error("Page size limit ignored");
    console.log("✓ Initial page size limit works");
    
    // 2. Next page cursor
    const cursor = data.pagination.nextCursor;
    if (!cursor) throw new Error("No cursor returned");
    
    let res2 = await fetch(`http://localhost:3000/api/options?pageSize=2&cursor=${encodeURIComponent(cursor)}`);
    let data2 = await res2.json();
    if (data2.items.length === 0) throw new Error("Next page returned no items");
    
    // Check for duplicates
    const idSet = new Set(data.items.map(i => i.id));
    for (const item of data2.items) {
        if (idSet.has(item.id)) throw new Error("Duplicate item found across pages");
    }
    console.log("✓ Cursor pagination works with no duplicates");
    
    // 3. Category eligibility mapping
    console.log("Testing Eligibility...");
    let resOBC = await fetch('http://localhost:3000/api/options?candidateCategory=2&pageSize=10'); // OBC
    let dataOBC = await resOBC.json();
    for (const item of dataOBC.items) {
        if (item.category.id !== 1 && item.category.id !== 2) {
            throw new Error(`Invalid category returned for OBC: ${item.category.id}`);
        }
    }
    console.log("✓ Category eligibility correctly applied on server");
    
    // 4. Batch details
    console.log("Testing Batch Compare...");
    const batchIds = [data.items[0].id, data.items[1].id];
    let resBatch = await fetch(`http://localhost:3000/api/options/batch?ids=${batchIds.join(',')}`);
    let dataBatch = await resBatch.json();
    if (dataBatch.length !== 2) throw new Error("Batch did not return 2 items");
    console.log("✓ Batch details fetched correctly");
    
    console.log("All tests passed!");
}

runTests().catch(e => {
    console.error("Test failed:", e);
    process.exit(1);
});
