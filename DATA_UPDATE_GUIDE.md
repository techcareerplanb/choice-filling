# Data Update Guide

This application separates frontend logic from data content, ensuring that code changes are not required when new counselling datasets become available.

## Update Process

When a new counselling year or round of data is published:

### 1. Place Raw Data
Drop the new dataset into `data/raw/All-India.json` or merge it with the existing dataset inside `data/All-India.json`.
*(Ensure the JSON matches the expected schema)*

### 2. Validate Data
Run the strict validation pipeline:
```bash
npm run validate-data
```
The script will analyze the dataset for:
- Identity errors (duplicate options, missing references)
- Cutoff errors (negative ranks, malformed rounds)
- Financial errors
- Referential integrity

**IMPORTANT**: If the validation outputs **"✗ Validation failed"**, you MUST fix the underlying data errors in the raw JSON before proceeding. The application build will abort on identity and referential errors. Warnings are informational and do not abort the build.

### 3. Build Processed Data
If validation passes, run the build pipeline to generate optimized datasets for the application:
```bash
npm run build-data
```
This script will:
- Extract normalized entities into `data/processed/`
- Generate relational indexes
- Auto-generate `metadata.json` documenting the dataset version and available rounds.

### State Counselling Data (e.g. Rajasthan, Punjab, Chattisgarh, Andhra, Telangana, etc.)
To add or update state-level counselling datasets:
1. Place the state raw JSON in `data/raw/<StateName>.json`
2. Process all states or specific states:
```bash
# Process all state datasets in data/raw
npm run build-states

# Or process specific states
node scripts/preprocess-states.js "Punjab" "Chattisgharh" "Andra Mng Quota" "Telangana mng quota"
```
Each state will be compiled into `data/processed/<StateName>/` and automatically served by the application.

### 4. Deploy
The frontend is completely static and reads from `data/processed/`. Simply deploy the updated repository to your hosting provider. No application logic changes are necessary.
