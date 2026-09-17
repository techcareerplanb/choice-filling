# Architecture Document

The NEET PG Counselling Decision Tool is a **Single Page Application (SPA)** that runs entirely in the client's browser. It requires no backend compute, making it highly scalable and cheap to host.

## Data Layer Architecture

### 1. Preprocessing (`scripts/preprocess.js`)
The raw JSON (`All-India.json`) is heavily nested and massive. It is preprocessed via Node.js into a highly normalized relational database split into multiple JSON fragments (`institutes.json`, `courses.json`, `options.json`, `cutoffs.json`, etc.) and a pre-calculated index map (`indexes.json`).

### 2. The Web Worker (`js/workers/data.worker.js`)
To prevent UI thread lockups when parsing megabytes of JSON data, the application spawns a dedicated Web Worker.
- The Worker utilizes `DataLoader.js` to fetch JSON fragments over HTTP and immediately caches them into the browser's `IndexedDB`.
- Upon subsequent reloads, data is instantly retrieved from `IndexedDB`, skipping network latency.
- The Worker instantiates `DataStore.js` (for O(1) object hydration) and `SearchIndex.js` (for O(1) multi-constraint filtering).

### 3. Search Pipeline
1. The UI sends search criteria (Rank, Category, Budget, etc.) to the Worker via asynchronous IPC (Inter-Process Communication) using `EngineClient`.
2. The Worker queries `SearchIndex.js` for initial structural matches (Institute, Course, Category).
3. The Worker streams these candidate IDs into `DataStore.js` to reconstruct hydrated objects containing financial and cutoff data.
4. Candidate objects are evaluated against `filterEngine.js` for hard financial constraints (Fee, Stipend, Bond).
5. Passing objects are evaluated by `cutoffEngine.js` and `fitEngine.js` to calculate historical rank margins.
6. The Worker sorts the array and returns a capped slice (top 200) to the UI to avoid IPC serialization bottlenecks.

## UI Layer Architecture

### 1. Router (`js/router.js`)
A vanilla JS hash-based router (`#/results`, `#/college/123`) manages view transitions. When a route changes, the `appContainer` DOM is cleared and handed over to the corresponding View Controller.

### 2. View Controllers (`js/ui/views/*.js`)
Views render HTML dynamically. They handle localized logic, such as updating active filters, rendering skeleton loaders, or binding event listeners to buttons.

### 3. State Management (`js/state.js`)
Global, mutable data (Shortlists and Comparison Pools) is managed via an observable state pattern. Components can subscribe to state changes to update their DOM dynamically (e.g., updating floating compare bars across different pages). This state is automatically serialized to `localStorage` to persist across reloads.
