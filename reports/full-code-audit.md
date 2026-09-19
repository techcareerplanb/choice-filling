# Full Code Audit — NEET PG Counselling Tool
**Audit Date:** 2026-09-19  
**Auditor:** Antigravity AI — Read-only review, no modifications made.  
**Server tested:** `http://localhost:3000`

---

## Executive Summary

| Severity | Count |
|---|---|
| Critical | 3 |
| High | 4 |
| Medium | 6 |
| Low | 6 |
| Informational | 5 |

### Tests Run

| Test Script | Result |
|---|---|
| `scripts/test-quota-filter.mjs` | ALL PASSED (7/7) |
| `scripts/test-category-eligibility.mjs` | ALL PASSED (6/6) |
| `scripts/test-state-filter.mjs` | ALL PASSED (6/6) |
| `scripts/test-college-filter.mjs` | ALL PASSED (4/4) |
| `scripts/test-deduplication.mjs` | PARTIAL PASS - JS logic OK but crashes on IDB |
| `scripts/test-specialisation-filter.mjs` | ALL PASSED (5/5) |
| `scripts/test-rank-margin.mjs` | ALL PASSED (10/10) |
| `scripts/test-budget.mjs` | ALL PASSED |
| Manual API tests (curl) | See findings below |

### Major Strengths

- Server-side search, filtering, sorting, and cursor pagination are fully implemented and working.
- Category eligibility (GEN/OBC/SC/ST/EWS) is correctly enforced on the server.
- Quota filtering works by both name and numeric ID.
- Admin write endpoint is properly protected with session authentication.
- Atomic write pattern for All-India.json (write-to-tmp, then rename) prevents data corruption.
- Backup rotation (last 10) and rollback-on-failure are in place.
- Seat matrix and cutoff data are served server-side only.
- express-rate-limit and compression middleware are configured.
- IndexedDB caching architecture is sound (separate stores, LRU enforcement).
- No active client-side fetch of processed JSON files (DataLoader is dead code).

### Production-Readiness Verdict

NOT PRODUCTION READY - 3 Critical and 4 High severity issues must be resolved first.

---

## SECURITY

### SEC-1
**Severity:** Critical  
**Title:** Hard-coded admin password with startup log disclosure  
**Location:** server.js:16, server.js:292  
**Evidence:**
```
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
console.log(`Default Admin Password: ${ADMIN_PASSWORD}`);
```
The fallback password 'admin123' is hard-coded in source and printed to the server console on every startup (line 292), including the actual resolved value.  
**Impact:** Any user with access to server logs learns the admin credential. Will be committed to git history if .env is absent.  
**Recommended fix:** Remove the startup log line. Remove the 'admin123' fallback — force the server to throw at startup if ADMIN_PASSWORD env var is not set. Add .env.example documenting required vars.

---

### SEC-2
**Severity:** Critical  
**Title:** No .gitignore — source data, backups, and credentials will be committed  
**Location:** Repository root (.gitignore does not exist)  
**Evidence:** `cat .gitignore` returned "NO_GITIGNORE_FOUND"  
**Impact:** data/All-India.json (46 MB), data/backups/, node_modules/, and any future .env file will all be tracked by git.  
**Recommended fix:** Create .gitignore with at minimum: node_modules/, data/backups/, .env, *.tmp, .DS_Store

---

### SEC-3
**Severity:** Critical  
**Title:** data/All-India.json (46 MB) fully publicly accessible via static file server  
**Location:** server.js:37 (`app.use(express.static(__dirname))`)  
**Evidence:** `curl http://localhost:3000/data/All-India.json` returns the full source data file immediately.  
**Impact:** All source data is publicly downloadable — defeating the purpose of server-side search. Exposes all fee/bond/remarks details and internal data structure.  
**Recommended fix:** Move static files to a dedicated `public/` folder. Only serve that:
```
app.use(express.static(path.join(__dirname, 'public')));
```
data/, server/, scripts/ must not be web-accessible.

---

### SEC-4
**Severity:** High  
**Title:** No brute-force protection on /api/login  
**Location:** server.js:48-55  
**Evidence:** The global apiLimiter allows 5000 req/15min — enough to attempt thousands of passwords. /api/login has no separate tighter limit or lockout.  
**Impact:** Admin password can be brute-forced without any meaningful throttling.  
**Recommended fix:** Add a dedicated tight rate limiter on /api/login (e.g., 10 attempts per 15 minutes per IP).

---

### SEC-5
**Severity:** High  
**Title:** Session secret is hard-coded  
**Location:** server.js:21  
**Evidence:** `secret: 'neet-pg-secret-key-xyz'`  
**Impact:** Session tokens can be forged by anyone who reads the source code.  
**Recommended fix:** `secret: process.env.SESSION_SECRET` — throw if not set.

---

### SEC-6
**Severity:** High  
**Title:** Session cookie missing sameSite and maxAge  
**Location:** server.js:20-25  
**Evidence:** `cookie: { secure: false }` — no sameSite or maxAge set.  
**Impact:** Without sameSite: 'strict', sessions are vulnerable to CSRF. Without maxAge, sessions persist indefinitely.  
**Recommended fix:**
```
cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true, sameSite: 'strict', maxAge: 8 * 60 * 60 * 1000 }
```

---

### SEC-7
**Severity:** Medium  
**Title:** appliedFilters echoes full raw query object in every API response  
**Location:** server/data.js:226  
**Evidence:** Response includes `"appliedFilters": { "pageSize": "1", "rank": "5000" }` — the complete raw req.query  
**Impact:** Future parameter changes (debug flags, internal params) could leak server-internal state.  
**Recommended fix:** Return an explicit allowlist of filter fields rather than the raw query object.

---

### SEC-8
**Severity:** Low  
**Title:** Server error messages include err.message which may expose internal paths  
**Location:** server.js:86, server.js:97, server.js:127  
**Evidence:** `res.status(500).json({ error: err.message })` — Node.js errors can include full filesystem paths.  
**Impact:** Information leakage — discloses server file layout to clients.  
**Recommended fix:** Log full error server-side; return a generic "Internal server error" to clients.

---

## DATA INTEGRITY

### DI-1
**Severity:** High  
**Title:** Admin edit does NOT reload in-memory server data after successful rebuild  
**Location:** server.js:264-278  
**Evidence:** After preprocess.js runs successfully, code returns success. There is no call to initDataLayer() to reload newly built processed files into memory.  
**Impact:** An admin who edits a college fee gets a "Success" response, but all subsequent API calls still return old data. Server must be manually restarted for changes to take effect.  
**Recommended fix:** After the successful rebuild, call `await initDataLayer()` before returning the success response.

---

### DI-2
**Severity:** Medium  
**Title:** readFileSync on 46 MB file in the admin update request handler blocks the event loop  
**Location:** server.js:170  
**Evidence:** `const rawData = fs.readFileSync(dataPath, 'utf8');` — synchronous I/O on main thread.  
**Impact:** All other requests are stalled for ~200-400ms while the file is read synchronously.  
**Recommended fix:** Replace with `await fs.promises.readFile(...)`.

---

### DI-3
**Severity:** Medium  
**Title:** No schema validation before writing to All-India.json  
**Location:** server.js:152-284  
**Evidence:** Fields are written directly from req.body.updates with only `Number(val)` coercion. No range checks (negative fees, absurd bond values, etc.)  
**Impact:** Malformed data can be written to source file and propagated to processed data.  
**Recommended fix:** Add a bounds-check validation function before the write step.

---

### DI-4
**Severity:** Low  
**Title:** Backup files are stored within the web-accessible data/ directory  
**Location:** server.js:249 (backup creation), server.js:37 (static serving)  
**Evidence:** Backups at data/backups/ are protected from directory listing but individual files are accessible if the naming convention is known.  
**Impact:** Backup files contain full source dataset — accessible to anyone knowing the timestamp-based filename format.  
**Recommended fix:** Store backups outside the web root, or explicitly block /data/backups/ paths.

---

### DI-5
**Severity:** Low  
**Title:** preprocess.js uses CJS (require) syntax in an ESM project  
**Location:** scripts/preprocess.js:1  
**Evidence:** `const fs = require('fs');` — CJS in a `"type": "module"` project.  
**Impact:** May throw "require is not defined" in some Node versions, causing rebuild failures without rollback being triggered correctly.  
**Recommended fix:** Convert to ESM import syntax or rename to preprocess.cjs.

---

## CORRECTNESS

### COR-1
**Severity:** Medium  
**Title:** Category filter silently dropped when candidate has two eligible categories (GEN + reserved)  
**Location:** js/engine/client.js:37, js/engine/client.js:102  
**Evidence:**
```
if (criteria.categoryIds && criteria.categoryIds.length === 1) params.append('candidateCategory', ...)
```
When a non-GEN candidate selects a category (e.g., SC), criteria.categoryIds = [1, 3] (2 elements). The client ONLY sends candidateCategory when length === 1. For SC candidates with 2 elements, no category filter is sent at all — server returns options for ALL categories.  
**Impact:** SC/ST/OBC/EWS candidates see seat options they are ineligible for.  
**Recommended fix:** Always send only the candidate's raw category ID. The server's getEligibleCategories() already handles the OPEN+reserved expansion correctly. Remove the client-side expansion logic.

---

### COR-2
**Severity:** Medium  
**Title:** getOption sibling search passes scalar IDs — SearchIndex only accepts arrays  
**Location:** server/data.js:236-240, js/data/SearchIndex.js:49-53  
**Evidence:**
```
searchIndex.search({ instituteId: ..., quotaId: ..., categoryId: ... })
```
SearchIndex only recognizes `instituteIds`, `quotaIds`, `categoryIds` (arrays). Scalar keys are silently ignored — sibling search always returns all options.  
**Impact:** College detail page shows incorrect/all options as siblings instead of filtered ones.  
**Recommended fix:** Pass arrays: `{ instituteIds: [id], quotaIds: [id], categoryIds: [id] }`

---

### COR-3
**Severity:** Low  
**Title:** update-data.js course loader expects res.data but new API returns res.items  
**Location:** js/ui/views/update-data.js:237-254  
**Evidence:** `if (res && res.data)` — EngineClient.search() returns `{ items, pagination, appliedFilters }`, not `{ data }`.  
**Impact:** Course dropdown in the admin editor never populates — course-scoped updates are impossible.  
**Recommended fix:** Change `res.data` to `res.items`.

---

### COR-4
**Severity:** Low  
**Title:** getFilteredIdentities (Shortlist All) missing seat data injection before filterOption  
**Location:** server/data.js:335-344  
**Evidence:** `filterOption(hydrated, extraCriteria)` is called but `hydrated.seatData` is never populated in this function. When seats filter is active, all items fail.  
**Impact:** "Shortlist All" with an active seats filter shortlists zero items.  
**Recommended fix:** Call SeatMatrixProvider.getSeats() before filterOption in getFilteredIdentities, matching the searchOptions pattern.

---

## PERFORMANCE

### PERF-1
**Severity:** Medium  
**Title:** Every search processes up to 21,771 options in a single synchronous loop, blocking the event loop  
**Location:** server/data.js:108-138  
**Evidence:** With no filters, candidateIds = 21,771. Each iteration calls getHydratedOption(), getSeats(), filterOption(), analyzeCutoffs(), and assessFit() synchronously on the main thread.  
**Impact:** Unfiltered search blocks all other requests for several seconds. Multiple concurrent users serialize poorly.  
**Recommended fix:** Use setImmediate() chunking to yield between batches, or move search to a Worker thread.

---

### PERF-2
**Severity:** Medium  
**Title:** Rate limiter threshold (5000/15min) is too permissive for an event-loop-blocking endpoint  
**Location:** server.js:28-34  
**Evidence:** At 5000 req/15min, aggressive clients can trigger 5+ concurrent unfiltered searches per second.  
**Impact:** A single misbehaving client can effectively DoS the server.  
**Recommended fix:** Reduce to 200/15min for /api/options; apply a tighter limit separately on /api/login.

---

### PERF-3
**Severity:** Low  
**Title:** appliedFilters raw query echoed in every response wastes bandwidth  
**Location:** server/data.js:226  
**Evidence:** Every API response includes the full raw query echoed back unnecessarily.  
**Recommended fix:** Remove or limit to a sanitized explicit field list.

---

## RELIABILITY / UX

### RUX-1
**Severity:** Medium  
**Title:** IndexedDB LRU enforcement runs async without awaiting, likely silently fails  
**Location:** js/engine/cache.js:129-147, js/engine/client.js:66  
**Evidence:** enforceLRU() is called without await. Inside, request.onsuccess accesses a store from a transaction that may already be closed.  
**Impact:** LRU enforcement does nothing — IDB stores grow unbounded. On storage-constrained devices, QuotaExceededError is silently swallowed.  
**Recommended fix:** Rewrite enforceLRU to use a single readwrite transaction for both getAllKeys and delete operations.

---

### RUX-2
**Severity:** Low  
**Title:** Expired/invalid cursor returns a user-unfriendly 400 with no frontend recovery  
**Location:** server.js:82-84, js/ui/views/results.js  
**Evidence:** Invalid cursor returns `"Invalid or expired cursor."` as JSON error with no frontend handling.  
**Impact:** If a user's cached cursor becomes stale after a server rebuild, results show an error rather than gracefully resetting to page 1.  
**Recommended fix:** In client.js, catch 400 INVALID_CURSOR responses and retry without the cursor, automatically reloading page 1.

---

### RUX-3
**Severity:** Low  
**Title:** Pagination buttons may not be disabled during in-flight requests  
**Location:** js/ui/views/results.js  
**Evidence:** No confirmed disable pattern around prev/next during fetches.  
**Impact:** Double-clicking Next can trigger concurrent fetches and land on wrong page.

---

## MAINTAINABILITY

### MAIN-1
**Severity:** High  
**Title:** Dead code — full WebWorker/DataLoader pipeline present but unused  
**Location:** js/workers/data.worker.js (183 lines), js/data/DataLoader.js (111 lines)  
**Evidence:** client.js comment: "No longer uses WebWorker". DataLoader opens a separate `neet_pg_relational_db` IndexedDB and fetches all processed JSON from browser. Neither is referenced from any active code path.  
**Impact:** (1) Maintenance confusion about active code path. (2) DataLoader contradicts the current server-side-only design. (3) Two separate IDB databases coexist confusingly in the browser.  
**Recommended fix:** Delete js/workers/data.worker.js, js/data/DataLoader.js, and any EligibilityProvider only used from the dead worker.

---

### MAIN-2
**Severity:** Medium  
**Title:** results.js is a 1,245-line monolith  
**Location:** js/ui/views/results.js (75,353 bytes)  
**Evidence:** Single file mixing data fetching, filter state, pagination logic, UI rendering, and animation.  
**Impact:** Extremely difficult to read, debug, or maintain. Regressions are hard to isolate.  
**Recommended fix:** Split into filterBar.js, resultsList.js, paginationControls.js, and a thin results.js orchestrator.

---

### MAIN-3
**Severity:** Medium  
**Title:** No Cache-Control: no-store on API responses  
**Location:** server.js (no cache headers set on /api/ routes)  
**Evidence:** No Cache-Control header observed in API responses.  
**Impact:** Browsers may cache stale GET responses for /api/options, /api/filter-metadata.  
**Recommended fix:** Add middleware: `app.use('/api/', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });`

---

### MAIN-4
**Severity:** Low  
**Title:** Batch endpoint allows 100 IDs — spec requires max 4 for Compare use  
**Location:** server.js:108  
**Evidence:** `if (ids.length > 100)` — design spec says max 4.  
**Impact:** Clients can request 100 full hydrated option objects, enabling a coarse data dump.  
**Recommended fix:** Change limit to 4 matching the Compare feature requirement.

---

### MAIN-5
**Severity:** Low  
**Title:** No HTTP-level integration tests for server routes  
**Location:** All test scripts in scripts/  
**Evidence:** All tests exercise filter logic at unit level, bypassing the Express route handler, query parsing, middleware, and cursor logic.  
**Impact:** Route-level regressions cannot be caught automatically.  
**Recommended fix:** Add HTTP integration tests using fetch or supertest against the running server.

---

### MAIN-6
**Severity:** Informational  
**Title:** Category eligibility map duplicated in client and server  
**Location:** server/data.js:19-25, js/ui/views/results.js:28-36  
**Evidence:** OPEN+OBC/SC/ST/EWS mapping appears in both the server data layer and the client results view.  
**Recommended fix:** Remove the client-side eligibility expansion. Always send only the raw candidateCategory ID to the server which is the authoritative resolver.

---

### MAIN-7
**Severity:** Informational  
**Title:** getOptionsBatch does not inject seat data or fit assessment  
**Location:** server/data.js:275-284  
**Evidence:** Batch handler returns options without seatData or _fit.  
**Impact:** Compare view will not show seat data or fit badges correctly.  
**Recommended fix:** Inject seatData and assessFit in the batch handler.

---

### MAIN-8
**Severity:** Informational  
**Title:** preprocess.js does not document that it does NOT generate seat-matrix files  
**Location:** scripts/preprocess.js  
**Evidence:** Seat-matrix JSON files exist in processed/ but are not written by preprocess.js — they come from separate ingest scripts.  
**Recommended fix:** Add a comment at the top of preprocess.js documenting which files it generates and which it does not touch.

---

### MAIN-9
**Severity:** Informational  
**Title:** test-deduplication.mjs crashes in Node due to missing IndexedDB global  
**Location:** scripts/test-deduplication.mjs  
**Evidence:** `ReferenceError: indexedDB is not defined` after JS logic passes.  
**Recommended fix:** Mock indexedDB in the test environment, or inject storage as a dependency.

---

## Test Coverage Summary

| Area | Status |
|---|---|
| Quota filter | GOOD (unit) |
| Category eligibility | GOOD (unit), MISSING at API level |
| State filter | GOOD |
| College filter | GOOD |
| Specialisation filter | GOOD |
| Rank/fit engine | GOOD |
| Budget filter | GOOD |
| Bond filter | NO TEST |
| Seats filter | NO TEST |
| Cursor pagination | NO TEST |
| Admin auth | NO TEST |
| Admin write + rollback | NO TEST |
| IndexedDB cache | PARTIAL PASS - crashes on IDB API |
| API HTTP route integration | NO TESTS AT ALL |

---

## Prioritized Remediation Plan

### P0 — Must fix before any shared or production use

1. SEC-3 — Static serving exposes all source data (defeats purpose, 46 MB data dump trivially accessible)
2. SEC-1 — Hard-coded password + startup logging (admin credential is guessable and logged)
3. DI-1 — No in-memory reload after admin edit (admin edits have no effect without restart)
4. COR-1 — Category filter dropped for 2-element categoryIds (SC/ST/OBC/EWS candidates see wrong results)
5. SEC-2 — No .gitignore (source data will be committed to git)

### P1 — Fix soon

1. SEC-4 — No brute-force limit on /api/login
2. SEC-5 — Hard-coded session secret
3. SEC-6 — Missing session cookie sameSite and maxAge
4. COR-2 — Sibling search uses scalar IDs (returns all options instead of correct siblings)
5. COR-3 — update-data.js checks res.data instead of res.items (admin course selector broken)
6. COR-4 — getFilteredIdentities missing seat data injection (Shortlist All with seats filter = 0 results)
7. MAIN-1 — Dead WebWorker/DataLoader code causes confusion and duplicate IDB
8. PERF-1 — Synchronous event-loop-blocking search loop

### P2 — Improvement

1. DI-2 — Synchronous readFileSync in update handler (~300ms event loop block)
2. DI-3 — No schema validation before writes
3. DI-5 — preprocess.js CJS vs ESM project
4. PERF-2 — Rate limit too permissive
5. MAIN-2 — 1,245-line results.js monolith
6. MAIN-3 — No Cache-Control: no-store on APIs
7. MAIN-4 — Batch endpoint allows 100 IDs (spec says 4)
8. RUX-1 — LRU enforcement silently broken (IDB grows unbounded)
9. MAIN-5 — No HTTP-level integration tests
10. SEC-7 — Raw query echoed in appliedFilters
