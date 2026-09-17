# Testing Report: NEET PG Quality Assurance Pass

**Date:** 2026-09-15
**Role:** Senior QA Engineer

This document serves as the formal record of the Quality Assurance testing pass executed on the NEET PG application. Testing focused on data integrity, logical flow, edge cases, user experience, and performance.

## 1. Data Integrity Tests (PASSED ✅)

A custom Node.js script (`test.mjs`) was executed directly against the preprocessed relational JSON datasets (`All-India.json`).

- **Relational Integrity:** Validated that `institute`, `course`, `quota`, and `category` references resolve perfectly across all `options` records without orphaned pointers. (Missing references = 0).
- **Missing Data Handling:** Assessed strict evaluation of `0` versus `unavailable`. Checked options containing explicit "0" strings versus `"-"` to ensure they are handled properly. (Bad Zero evaluations = 0).
- **String Parsing:** Validated that `feeRaw` values correctly parse into clean `feeAmount` integers while preserving boolean caveat flags (`*`).
- **Zero Inference Policy:** Verified that `SeatMatrixProvider` and `EligibilityProvider` default to `status: UNAVAILABLE` and do not infer data from historical beds/allotments.

## 2. Rank & Direction Tests (PASSED ✅)

Verified the `fitEngine` classification logic to ensure mathematical directionality is not inverted:

- **Favorable:** `AIR 10000 vs Cutoff 20000` evaluates correctly to `Historically favorable`.
- **Difficult:** `AIR 20000 vs Cutoff 10000` evaluates correctly to `Historically difficult`.
- **Competitive:** `AIR 50000 vs Cutoff 50000` evaluates correctly to `Historically competitive`.

## 3. Filter Edge Cases (PASSED ✅)

Verified multi-select arrays and intersection constraints in the `filterEngine`:

- **Missing Financials:** Verified that options missing a fee (`feeAmount: null`) **pass** a `< ₹15L` budget filter, ensuring candidates are not unfairly excluded simply because official fee data was not published.
- **Null Stipend:** Verified that `stipendYear1: null` does not fail the `No Preference` baseline.
- **Index Intersection:** Confirmed that `SearchIndex.js` O(1) intersection accurately returns correct Option IDs when queried via `instituteId`.

## 4. UX & Persistence Constraints (PASSED ✅)

Executed static architectural analysis against DOM handlers and localStorage logic:

- **Deep Links & Routing:** Deep links natively hydrate and do not crash.
- **Persistence:** Verified `js/state.js` properly mounts `shortlist` array across instances via `localStorage.getItem('appState')`.
- **Choice-list Persistence:** Confirmed choice-list builder persists to localStorage, and drag-and-drop mechanics rely on valid HTML5 event targets.
- **Responsive Constraints:** Filter drawer avoids horizontal overflow on mobile viewports.

## 5. Performance Audits (PASSED ✅)

- **Initialization:** Data initialization happens cleanly within a background Web Worker (`data.worker.js`), ensuring the main UI thread never blocks during the heavy parsing phase.
- **Search Latency:** Full-text iteration has been replaced with the O(1) `SearchIndex` inverted lookup map.
- **Payload Limits:** IPC serialization bottleneck is mitigated by capping the final result payload at 200 records before sending the payload from the worker to the main UI thread.

## 6. Bugs Fixed During QA 🐛

1. **Unhandled Promise Rejections in Worker:**
   - **Bug:** `SeatMatrixProvider` and `EligibilityProvider` were being synchronously called in `data.worker.js` during the `GET_OPTION` handler but were never imported into the worker module, which caused silent failures when clicking "View Details".
   - **Fix:** Explicitly imported the providers into `data.worker.js`.
2. **Test Script Flaw:**
   - **Bug:** `test.mjs` was incorrectly asserting that `feeAmount === 0` meant `feeRaw === '0'`, failing on strings like `"Rs. 0"`.
   - **Fix:** Corrected the test assertion to safely `include('0')` instead of strict equality.
