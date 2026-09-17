# DATA ASSUMPTIONS & TRANSFORMATION RULES

Based on the technical inspection of `All-India.json` and strict product requirements, the following rules govern how the data is transformed and interpreted by the application. 

**Core Principle:** *Never invent data. Never fabricate. Preserve source caveats.*

---

## 1. Missing Historical Rounds
**SOURCE FIELD:** e.g., missing `cr_2025_4`
**TRANSFORMED FIELD:** omitted from the record's `cutoffs` array (or marked explicitly as missing).
**TRANSFORMATION RULE:** If a round object does not exist for a specific year/round combination, it is skipped. It is **NOT** converted to 0, nor is it interpolated.
**POSSIBLE CAVEAT:** A user might filter for a course and see no data for round 4, interpreting it as "no seats were available," which is the technically accurate interpretation of missing allotment data.

## 2. Hospital Beds
**SOURCE FIELD:** `beds: "3025"`, `beds: "-"`, `beds: "Info Not Available"`
**TRANSFORMED FIELD:** `bedsCount` (Number | Null), `bedsStatus` (String)
**TRANSFORMATION RULE:** 
- If numeric: `bedsCount: 3025`, `bedsStatus: "available"`. 
- If `"-"` or `"Info Not Available"`: `bedsCount: null`, `bedsStatus: "unavailable"`.
**POSSIBLE CAVEAT:** We strictly enforce that `beds` represents hospital capacity, **not** course seat counts. The UI must explicitly label this as "Hospital Beds", not "Seats".

## 3. Financial Data (Asterisks)
**SOURCE FIELD:** `fee: "₹69,470*"`, `bond_penalty: "₹50,00,000*"`
**TRANSFORMED FIELD:** `feeAmount` (Number), `feeHasCaveat` (Boolean), `feeString` (String)
**TRANSFORMATION RULE:** 
- Strip non-numeric characters to create an indexable `feeAmount` for filtering (e.g., `69470`).
- If `*` is present, set `feeHasCaveat: true`.
- Store the original `feeString` (e.g., `"₹69,470*"`) for display to preserve source accuracy.
**POSSIBLE CAVEAT:** Filtering by budget might miss records if the source string is highly non-standard. The caveat flag must be clearly shown to the user so they know the amount is subject to official MCC/State conditions.

## 4. Course Seats (Absence of Data)
**SOURCE FIELD:** Not present in JSON (only `allotments_count` exists per historical round).
**TRANSFORMED FIELD:** N/A
**TRANSFORMATION RULE:** Do not build fake seat counts. Do not use `allotments_count` as a definitive proxy for the official seat matrix, as it only represents filled seats in a specific round.
**POSSIBLE CAVEAT:** The UI will display "Data Not Available" for official Seat Counts until a true seat matrix JSON is provided.

## 5. Domicile Eligibility
**SOURCE FIELD:** `state: "Kerala"`
**TRANSFORMED FIELD:** `instituteState: "Kerala"`
**TRANSFORMATION RULE:** Expose the state as geographic location only. 
**POSSIBLE CAVEAT:** Do **not** automatically infer domicile eligibility based on this state. For example, AIQ (All India Quota) implies pan-India eligibility regardless of the institute's state. Eligibility rules will be strictly evaluated based on `quota` and explicit domicile flags (when provided), not raw geography.

## 6. Admission Probability
**SOURCE FIELD:** Historical cutoffs (e.g., `closing_rank: 696`)
**TRANSFORMED FIELD:** `historicalComparison`
**TRANSFORMATION RULE:** Do not invent "probability percentages" (e.g., 85% chance). Compare the user's rank against historical cutoffs and present the data factually (e.g., "Your rank is 200 below the 2024 Round 2 closing rank").
**POSSIBLE CAVEAT:** Users must not interpret a lower rank than the historical cutoff as a guaranteed admission.

## 7. Cutoff Object Restructuring
**SOURCE FIELD:** Dynamic keys (`cr_2024_1`, `cr_2024_2`, etc.)
**TRANSFORMED FIELD:** Array of objects: `cutoffs: [{ year: 2024, round: 1, closing_rank: 696, allotments: 2 }]`
**TRANSFORMATION RULE:** Map the dynamic root keys into a queryable array inside the record, preserving `year`, `round`, `closing_rank`, and `allotments_count`.
**POSSIBLE CAVEAT:** Some records may have an empty `cutoffs` array if no historical data exists. These records must still be displayed as valid counselling opportunities, just lacking historical context.
