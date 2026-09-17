# DATA DICTIONARY: All-India.json

This document provides a comprehensive structural and statistical breakdown of the `All-India.json` source data, based on a rigorous runtime inspection.

## High-Level Statistics

- **Total Records:** 21,771
- **Unique Institutes:** 1,894
- **Unique Courses:** 100
- **Unique Quotas:** 13
- **Unique Categories:** 14
- **Unique Counselling Types:** 1 (All India Counseling - PG Medical)
- **Available Years:** 2024, 2025
- **Available Rounds:** 1, 2, 3, 4, 5

## Field Definitions & Frequencies

Every record in the dataset is guaranteed to have the base entity fields (`id`, `state`, `institute`, `course`, `quota`, `category`, `counselling`). The historical round cutoffs and financial variables have varying presence and formatting caveats.

| Field | Type | Frequency | Description |
|-------|------|-----------|-------------|
| `id` | Number | 21,771 | Unique identifier for the counselling opportunity |
| `state` | String | 21,771 | The geographical state of the institute |
| `institute` | Object | 21,771 | Contains `id`, `name`, `short_name`, `logo_url`, `district` |
| `course` (Specialisation) | Object | 21,771 | Serves as the **Specialisation** dimension (e.g. Cardiology, Neurology). Contains `id`, `name`, `short_name`. Prefixes include MD, MS, DNB, Diploma, MCh, Master. |
| `quota` | Object | 21,771 | Contains `id`, `name`, `short_name`, `master_quota` |
| `category` | String | 21,771 | e.g. GEN, OBC, SC-PwD, NRI-Priority II, etc. |
| `counselling` | Object | 21,771 | Contains `id`, `name`, `short_name` |
| `cr_2024_1` | Object | 13,931 | Round 1 cutoffs for 2024 |
| `cr_2024_2` | Object | 13,875 | Round 2 cutoffs for 2024 |
| `cr_2024_3` | Object | 14,935 | Round 3 cutoffs for 2024 |
| `cr_2024_4` | Object | 2,156 | Round 4 cutoffs for 2024 |
| `cr_2024_5` | Object | 527 | Round 5 cutoffs for 2024 |
| `cr_2025_1` | Object | 14,540 | Round 1 cutoffs for 2025 |
| `cr_2025_2` | Object | 15,559 | Round 2 cutoffs for 2025 |
| `cr_2025_3` | Object | 16,975 | Round 3 cutoffs for 2025 |
| `cr_2025_4` | Object | 2,566 | Round 4 cutoffs for 2025 |
| `fee_id` | Number/Null | 21,747 | Internal ID linking to fee schedule (24 nulls) |
| `fee` | String | 21,771 | Annual fee (e.g., "₹69,470*"). Contains '*' in 14,836 records. |
| `stipend_year_1`| String | 21,771 | Year 1 stipend. Contains '*' in 7,486 records. |
| `bond_years` | String | 21,771 | Required service years. Contains '*' in 10,814 records. |
| `bond_penalty`| String | 21,771 | Penalty for breaking bond. Contains '*' in 10,814 records. |
| `beds` | String | 21,771 | Hospital capacity. 1,580 records are marked unavailable ("-", "Info Not Available", "0") |
| `choice_list_count`| Number | 21,771 | Count of times this choice was added to a user's list |

## Detailed Findings

### 1. Missing / Incomplete Data
- **Missing Historical Rounds:** Out of 21,771 records, **21,721** are missing at least one historical round. Some opportunities only exist in Round 3, some disappear in Round 2, etc. These missing rounds mean no allotment happened for that category/quota in that round.
- **Null Values:** `fee_id` is the only base key containing nulls (`24` instances).

### 2. Ambiguous & Inconsistent Formatting
- **Financial Asterisks:** A significant portion of financial data contains an asterisk (`*`), representing a caveat from the MCC/State authorities (e.g. subject to court orders, varying per year). Over 68% of fee records have this asterisk.
- **Beds:** Contains non-numeric strings like `"-"`, `"Info Not Available"`, and `"Not Available"`.

### 3. Categories & Quotas
- **Quota / Master Quota Combinations (13):**
  - AIQ | AIQ
  - DU | DU
  - IP | IP
  - DNB Post MBBS | DNB
  - BHU | BHU
  - AMU | AMU
  - NBE Diploma | DNB
  - MNG | Deemed to be Univ Seats
  - AFMS | AFMS
  - NRI | Deemed to be Univ Seats
  - AFMS-DNB | AFMS-DNB
  - JM | Deemed to be Univ Seats
  - MM | Deemed to be Univ Seats
- **Category Formats (14):**
  - Standard: `GEN`, `EWS`, `OBC`, `SC`, `ST`
  - PwD: `GEN-PwD`, `EWS-PwD`, `OBC-PwD`, `SC-PwD`, `ST-PwD`
  - Special: `AFMS-Priority IV`, `AFMS-Priority III`, `NRI-Priority II`, `NRI-Priority I`

### 4. Suspicious / Unclear Fields
- `candidate_flag` (inside cutoff objects) is consistently `null`.
- `inservice_candidate` (inside cutoff objects) is usually `false`, semantics for `true` require domain knowledge of in-service quotas.
- `value` (e.g., `"696(2)"`) maps to `closing_rank` and `allotments_count`, but keeping it intact is safer than parsing it manually, as the JSON already breaks down `closing_rank` (696) and `allotments_count` (2) into separate keys.
