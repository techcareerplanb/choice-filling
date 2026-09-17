# NEET PG Counselling Decision Tool

A comprehensive, client-side static web application designed to help medical aspirants navigate the NEET PG counselling process using historical data.

This tool acts strictly as an **advisory planner** and makes no guaranteed admission claims.

## Overview
The application processes historical allotment data, fee structures, and service bond details to recommend historically favorable, competitive, and difficult choices based on a candidate's All India Rank (AIR).

## Project Structure
- `index.html`: The main entry point (Single Page Application).
- `css/`: Global stylesheets and component-specific styling using CSS variables.
- `js/`: Modular ES6 application logic.
  - `js/app.js`: Application bootstrap.
  - `js/router.js`: Hash-based SPA routing.
  - `js/state.js`: Global state management for Shortlist and Comparison pools.
  - `js/ui/`: View controllers and DOM renderers.
  - `js/data/`: Data providers, indexing, and IndexedDB caching wrappers.
  - `js/engine/`: Business logic (Fit algorithms, filtering, sorting).
  - `js/workers/`: Web Worker (`data.worker.js`) for background data hydration.
- `scripts/`: Node.js utilities for data preprocessing.
- `data/`: Raw and processed JSON datasets.

## How to Run (Development)
The application is a pure static site but requires a local HTTP server to resolve ES6 module imports and Web Worker boundaries.

1. Navigate to the project root.
2. Start a local server:
   ```bash
   python3 -m http.server 8000
   # OR
   npx serve .
   ```
3. Open `http://localhost:8000` in a modern web browser.

## Data Preprocessing
Raw dataset (`data/All-India.json`) is processed into relational, indexable subsets to ensure instantaneous client-side searching.

To rebuild the processed data:
1. Ensure Node.js is installed.
2. Place your raw dataset at `data/raw/All-India.json` (or `data/All-India.json`).
3. Run the validation script to ensure data integrity:
   ```bash
   npm run validate-data
   ```
4. Run the preprocessing script:
   ```bash
   npm run build-data
   ```
5. The script will output relational fragments (e.g., `institutes.json`, `options.json`, `indexes.json`, `metadata.json`) into the `data/processed/` directory.

Please see [DATA_UPDATE_GUIDE.md](DATA_UPDATE_GUIDE.md) for more details.

## Deployment
Because the tool is entirely static, it can be deployed to any static hosting provider (GitHub Pages, Vercel, Netlify, AWS S3).
No backend database or Node.js server is required in production.

1. Build the processed data using the steps above.
2. Upload the entire project directory (excluding `scripts/` if desired) to your static host.

## Browser Requirements
- A modern web browser (Chrome, Firefox, Safari, Edge) released within the last 3 years.
- JavaScript must be enabled.
- Web Worker and IndexedDB support are required.
