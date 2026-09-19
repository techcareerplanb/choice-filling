/**
 * HTTP Integration Tests for the NEET PG Counselling server.
 *
 * These tests exercise the real Express routes — not internal functions.
 *
 * Prerequisites:
 *   - Server must be running: npm start
 *   - ADMIN_PASSWORD and SESSION_SECRET env vars must be set
 *   - Run: node scripts/test-http-integration.mjs
 */

const BASE = 'http://localhost:3000';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

let passed = 0;
let failed = 0;

function assert(condition, label) {
    if (condition) {
        console.log(`  ✅ PASS: ${label}`);
        passed++;
    } else {
        console.error(`  ❌ FAIL: ${label}`);
        failed++;
    }
}

async function get(url, opts = {}) {
    const res = await fetch(`${BASE}${url}`, opts);
    let body;
    try { body = await res.json(); } catch { body = null; }
    return { status: res.status, body };
}

async function post(url, body, extraHeaders = {}, opts = {}) {
    const res = await fetch(`${BASE}${url}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...extraHeaders },
        body: JSON.stringify(body),
        ...opts
    });
    let resBody;
    try { resBody = await res.json(); } catch { resBody = null; }
    return { status: res.status, body: resBody, headers: res.headers };
}

// ─── Test 1: Protected source files must NOT be accessible ─────────────────
async function testProtectedFiles() {
    console.log('\n── Test Suite 1: Protected files return 404 ──');

    const protectedPaths = [
        '/data/All-India.json',
        '/data/backups/',
        '/server/data.js',
        '/scripts/preprocess.js',
        '/.env',
        '/package.json',
    ];

    for (const p of protectedPaths) {
        const res = await get(p);
        assert(
            res.status === 404 || res.status === 403,
            `${p} → ${res.status} (expected 404 or 403)`
        );
    }
}

// ─── Test 2: Required browser assets ARE accessible ────────────────────────
async function testPublicAssets() {
    console.log('\n── Test Suite 2: Browser assets are accessible ──');

    const { status } = await fetch(`${BASE}/`);
    assert(status === 200, `GET / → 200 (index.html)`);

    const { status: cssStatus } = await fetch(`${BASE}/css/styles.css`);
    assert(cssStatus === 200, `GET /css/styles.css → 200`);

    const { status: jsStatus } = await fetch(`${BASE}/js/app.js`);
    assert(jsStatus === 200, `GET /js/app.js → 200`);
}

// ─── Test 3: Login rate limiting ───────────────────────────────────────────
async function testLoginRateLimit() {
    console.log('\n── Test Suite 3: Login rate limiting ──');

    let rateLimitHit = false;
    // Fire 11 failed attempts — expect the 11th (or before) to be rate-limited
    for (let i = 0; i < 11; i++) {
        const { status } = await post('/api/login', { password: 'wrong_password_test_' + i });
        if (status === 429) {
            rateLimitHit = true;
            break;
        }
    }
    assert(rateLimitHit, 'Login is rate-limited after 10 failed attempts (429 received)');
}

// ─── Test 4: Category eligibility filter by API ────────────────────────────
async function testCategoryEligibilityAPI() {
    console.log('\n── Test Suite 4: Category eligibility filter (API level) ──');

    // Category IDs: GN=1, OBC=2, SC=3, ST=4, EWS=5 (as preprocessed)
    // candidateCategory=3 (SC) → should only return options with category 1 (OPEN) or 3 (SC)
    const res = await get('/api/options?candidateCategory=3&pageSize=20');
    assert(res.status === 200, 'SC filter request succeeds (200)');
    assert(res.body && res.body.pagination && res.body.pagination.totalMatching > 0, 'SC filter returns results');

    if (res.body && res.body.items && res.body.items.length > 0) {
        const allEligible = res.body.items.every(item => {
            const catId = item.category && item.category.id;
            return catId === 1 || catId === 3; // OPEN or SC
        });
        assert(allEligible, 'All returned items for SC candidate have category OPEN(1) or SC(3)');
    }

    // candidateCategory=5 (EWS) → should only return OPEN(1) or EWS(5)
    const ewsRes = await get('/api/options?candidateCategory=5&pageSize=20');
    assert(ewsRes.status === 200, 'EWS filter request succeeds (200)');
    if (ewsRes.body && ewsRes.body.items && ewsRes.body.items.length > 0) {
        const allEligible = ewsRes.body.items.every(item => {
            const catId = item.category && item.category.id;
            return catId === 1 || catId === 5; // OPEN or EWS
        });
        assert(allEligible, 'All returned items for EWS candidate have category OPEN(1) or EWS(5)');
    }

    // candidateCategory=1 (GN/OPEN) → should only return OPEN
    const gnRes = await get('/api/options?candidateCategory=1&pageSize=10');
    assert(gnRes.status === 200, 'GN filter request succeeds (200)');
    if (gnRes.body && gnRes.body.items && gnRes.body.items.length > 0) {
        const allOpen = gnRes.body.items.every(item => item.category && item.category.id === 1);
        assert(allOpen, 'All returned items for GN candidate have category OPEN(1) only');
    }

    // candidateCategory=999 (unknown) → zero results
    const unknownRes = await get('/api/options?candidateCategory=999&pageSize=10');
    assert(
        unknownRes.status === 200 && unknownRes.body.pagination.totalMatching === 0,
        'Unknown category returns 0 results'
    );
}

// ─── Test 5: Invalid cursor returns clean 400 ──────────────────────────────
async function testCursorHandling() {
    console.log('\n── Test Suite 5: Cursor handling ──');

    const invalidCursor = Buffer.from('cursor_99999999').toString('base64');
    const res = await get(`/api/options?cursor=${invalidCursor}`);
    assert(res.status === 400, 'Stale/invalid cursor returns 400');
    assert(res.body && res.body.error, 'Error message returned for invalid cursor');

    // Valid pagination flow
    const page1 = await get('/api/options?pageSize=2');
    assert(page1.status === 200, 'Page 1 request succeeds');
    assert(page1.body.pagination.nextCursor, 'Page 1 returns nextCursor');

    const page2 = await get(`/api/options?pageSize=2&cursor=${page1.body.pagination.nextCursor}`);
    assert(page2.status === 200, 'Page 2 using nextCursor succeeds');
    const p1Ids = page1.body.items.map(i => i.id);
    const p2Ids = page2.body.items.map(i => i.id);
    const noDuplicates = !p1Ids.some(id => p2Ids.includes(id));
    assert(noDuplicates, 'Page 2 items have no duplicates from page 1');
}

// ─── Test 6: Admin edit requires authentication ────────────────────────────
async function testAdminAuth() {
    console.log('\n── Test Suite 6: Admin authentication ──');

    // Unauthenticated update must fail
    const unauth = await post('/api/update-college', { instituteId: 1, scope: 'college', updates: {} });
    assert(unauth.status === 401, 'Unauthenticated update-college returns 401');

    // Wrong password
    const wrongPwd = await post('/api/login', { password: 'wrong_password_definitely' });
    assert(wrongPwd.status === 401, 'Wrong password returns 401');

    if (!ADMIN_PASSWORD) {
        console.log('  ⚠️  ADMIN_PASSWORD env var not set — skipping authenticated admin tests');
        return;
    }

    // Correct password
    const loginRes = await post('/api/login', { password: ADMIN_PASSWORD });
    assert(loginRes.status === 200, 'Correct password returns 200');
    assert(loginRes.body && loginRes.body.success, 'Login body has success:true');

    // Note: session cookie is not forwarded in this simple fetch test without a cookie jar.
    // check-auth with no cookie should still return unauthenticated
    const checkAuth = await get('/api/check-auth');
    assert(checkAuth.body.isAuthenticated === false, 'check-auth without session cookie returns false');
}

// ─── Test 7: Admin edit → API reflects change without restart (hot reload) ─
async function testHotReload() {
    console.log('\n── Test Suite 7: Admin edit hot-reload ──');

    if (!ADMIN_PASSWORD) {
        console.log('  ⚠️  ADMIN_PASSWORD env var not set — skipping hot-reload test');
        return;
    }

    // Use a cookie jar-style approach: capture the Set-Cookie header from login.
    // The login rate limiter only counts failed requests (skipSuccessfulRequests: true),
    // so a correct password should always succeed even after prior failed attempts.
    let loginRawRes = await fetch(`${BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: ADMIN_PASSWORD })
    });
    // If somehow rate-limited, wait and retry once
    if (loginRawRes.status === 429) {
        console.log('  ⚠️  Rate-limited on login, waiting 2s and retrying...');
        await new Promise(r => setTimeout(r, 2000));
        loginRawRes = await fetch(`${BASE}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: ADMIN_PASSWORD })
        });
    }
    const setCookie = loginRawRes.headers.get('set-cookie');
    assert(loginRawRes.status === 200, 'Login succeeded for hot-reload test');
    assert(!!setCookie, 'Login returned a Set-Cookie header');

    if (!setCookie) return;

    // Pick a real option to test with
    const optionsRes = await get('/api/options?pageSize=1');
    if (!optionsRes.body || !optionsRes.body.items || !optionsRes.body.items.length) {
        console.log('  ⚠️  No options available for hot-reload test');
        return;
    }
    const testOption = optionsRes.body.items[0];
    const testInstId = testOption.institute.id;
    const testOptId = testOption.id;
    const originalRemarks = testOption.financials && testOption.financials.remarks;

    // Make a harmless update: set a unique remark
    const uniqueRemark = `integration-test-${Date.now()}`;
    const updateRes = await fetch(`${BASE}/api/update-college`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': setCookie
        },
        body: JSON.stringify({
            instituteId: testInstId,
            scope: 'college',
            updates: { remarks: uniqueRemark }
        })
    });
    const updateBody = await updateRes.json();
    assert(updateRes.status === 200, `Admin edit returned 200 (got ${updateRes.status}: ${JSON.stringify(updateBody)})`);
    assert(updateBody.success === true, 'Admin edit body has success:true');

    // Immediately verify the API reflects the change (no restart)
    const afterRes = await get(`/api/options/${testOptId}`);
    assert(afterRes.status === 200, 'Option detail request after edit returns 200');
    const updatedRemarks = afterRes.body && afterRes.body.financials && afterRes.body.financials.remarks;
    assert(updatedRemarks === uniqueRemark, `Option detail reflects updated remark: "${updatedRemarks}"`);

    // Restore original remark
    if (updateRes.status === 200) {
        await fetch(`${BASE}/api/update-college`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cookie': setCookie },
            body: JSON.stringify({
                instituteId: testInstId,
                scope: 'college',
                updates: { remarks: originalRemarks || '' }
            })
        });
        console.log(`  ℹ️  Restored original remarks for institute ${testInstId}`);
    }
}

// ─── Main ─────────────────────────────────────────────────────────────────
async function runAll() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  HTTP Integration Tests — NEET PG Counselling Server');
    console.log(`  Target: ${BASE}`);
    console.log('═══════════════════════════════════════════════════════');

    try {
        // Quick connectivity check
        const ping = await fetch(BASE).catch(() => null);
        if (!ping) {
            console.error('\n❌ Cannot reach server. Is it running? (npm start)\n');
            process.exit(1);
        }
    } catch (e) {
        console.error('\n❌ Connectivity check failed:', e.message);
        process.exit(1);
    }

    await testProtectedFiles();
    await testPublicAssets();
    await testCategoryEligibilityAPI();
    await testCursorHandling();
    await testAdminAuth();
    await testHotReload();     // Hot-reload before rate-limit so login still works
    await testLoginRateLimit(); // Rate-limit test runs last — it consumes the login budget

    console.log('\n═══════════════════════════════════════════════════════');
    console.log(`  Results: ${passed} passed, ${failed} failed`);
    console.log('═══════════════════════════════════════════════════════\n');

    if (failed > 0) process.exit(1);
}

runAll().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
});
