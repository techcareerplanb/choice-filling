# NEET PG Data Methodology & Architecture Rules

This document outlines the strict methodological rules the application adheres to when processing and presenting data to medical graduates. Because counselling decisions are high-stakes, this application follows a "Zero Inference" policy.

## 1. Seat Matrix Constraints

The application must **never** fabricate or infer the official seat matrix.

- **Beds != Seats**: A hospital possessing 500 beds does not guarantee any specific number of PG medical seats in a given branch. We do not use hospital statistics to estimate seat matrices.
- **Historical Allotments != Current Seats**: The fact that 4 allotments were made to a specific course/quota in 2024 does NOT mean 4 seats are available in 2025. Seats can be added, revoked by the NMC, or shifted to different quotas.
- **Empty State**: Until the official MCC seat matrix is published, the application will query `SeatMatrixProvider` and explicitly display: *"Seat count unavailable"*. It will never display `0` (which implies a verified absence of seats).

## 2. Domicile & Eligibility Constraints

Eligibility rules are highly complex and subject to state-specific policies and active court orders.

- **Institute State != Automatic Eligibility**: A candidate cannot automatically assume eligibility for a state quota seat simply because their domicile state matches the institute's state. 
- **Institutional & Minority Quotas**: Many institutes maintain internal quotas (e.g. AMU, BHU, DU) or linguistic minority quotas which require specific proofs of eligibility entirely separate from geographical domicile.
- **Empty State**: Until an official eligibility rule engine is loaded, the `EligibilityProvider` will return an `UNAVAILABLE` status, and the UI will explicitly display: *"Domicile eligibility could not be verified"*.

## 3. Financial Constraints

Financial data is sourced from official fee structures but must be treated carefully due to mid-counselling revisions.

- **Caveats**: Any financial value in the raw data containing an asterisk (`*`) is flagged via a boolean `hasCaveat` property. This triggers a visual warning (`⚠️`) in the UI, indicating that the value is subject to specific conditions or pending court orders.
- **Missing Values**: Missing fee, stipend, or bond data is rendered as `"Not available"`. It is never cast to `0` or `No Bond` unless explicitly stated in the source data.

## 4. Cutoff Integrity

- **Missing Rounds**: If a college did not participate in Round 3 in a historical year, the application renders a dash (`—`). It does not render `0` or interpolate the data.
- **No Probability Claims**: The application generates deterministic recommendations (Dream / Target / Safe) based on historical rank margins. It **never** exposes fabricated admission probability percentages (e.g. "84% chance of admission"). Historical data does not guarantee future admission.
