export function renderUpdateData(container, params) {
    let authChecked = false;
    let isAuthenticated = false;
    let currentRecord = null;
    let currentCounselling = localStorage.getItem('activeCounselling') || 'All-India';
    let loadedCourses = [];
    let loadedOptions = [];
    let currentEditorMode = 'form'; // 'form' or 'json'

    container.innerHTML = `
        <div class="container" style="max-width:1100px; padding:2rem 1rem;">
            <!-- Header -->
            <div style="margin-bottom:2rem; border-bottom:1px solid var(--border-color); padding-bottom:1.5rem; display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem;">
                <div>
                    <h1 style="margin:0 0 0.5rem 0; font-size:2rem; color:var(--text); font-weight:700;">Data Administration Editor</h1>
                    <p style="margin:0; color:var(--text-muted); font-size:0.95rem;">
                        Edit and inspect every parameter of any counselling data point. Updates are saved directly to raw source JSON and compiled into relational indexes.
                    </p>
                </div>
                <div id="auth-section">
                    <!-- Auth UI injected here -->
                </div>
            </div>

            <div id="editor-container" style="display:none;">
                <!-- Counselling Selector & Target Selection -->
                <div class="card" style="background:var(--bg-surface); padding:1.5rem; border-radius:12px; border:1px solid var(--border-color); margin-bottom:2rem; box-shadow:var(--shadow-sm);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; flex-wrap:wrap; gap:1rem;">
                        <h2 style="margin:0; font-size:1.25rem; font-weight:600;">1. Target Data Point Selection</h2>
                        <div style="display:flex; align-items:center; gap:0.5rem;">
                            <label style="font-size:0.875rem; font-weight:500; color:var(--text-muted);">Active Counselling:</label>
                            <select id="select-counselling" class="form-control" style="padding:0.4rem 0.75rem; font-size:0.875rem; border-radius:6px; min-width:180px;">
                                <option value="All-India">All-India</option>
                            </select>
                        </div>
                    </div>

                    <!-- Search Method Tabs -->
                    <div style="display:flex; gap:0.5rem; border-bottom:1px solid var(--border-color); margin-bottom:1.25rem;">
                        <button type="button" id="tab-btn-hierarchical" class="btn" style="border:none; border-bottom:2px solid var(--primary-color); background:transparent; font-weight:600; padding:0.5rem 1rem; border-radius:0;">
                            Browse College & Course
                        </button>
                        <button type="button" id="tab-btn-optionid" class="btn text-muted" style="border:none; border-bottom:2px solid transparent; background:transparent; font-weight:500; padding:0.5rem 1rem; border-radius:0;">
                            Direct Option ID Lookup
                        </button>
                    </div>

                    <!-- Tab 1: Hierarchical Selection -->
                    <div id="tab-panel-hierarchical" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:1rem;">
                        <div>
                            <label class="form-label" style="display:block; margin-bottom:0.4rem; font-weight:500; font-size:0.875rem;">Select College</label>
                            <select id="select-college" class="form-control" style="width:100%; padding:0.6rem; border:1px solid var(--border-color); border-radius:8px;">
                                <option value="">-- Loading colleges... --</option>
                            </select>
                        </div>
                        <div>
                            <label class="form-label" style="display:block; margin-bottom:0.4rem; font-weight:500; font-size:0.875rem;">Edit Scope</label>
                            <select id="select-scope" class="form-control" style="width:100%; padding:0.6rem; border:1px solid var(--border-color); border-radius:8px;" disabled>
                                <option value="option">Single Option (Exact Record)</option>
                                <option value="course">Course-Wide (All Quotas for Course)</option>
                                <option value="college">College-Wide (All Courses for College)</option>
                            </select>
                        </div>
                        <div id="course-selection-wrap" style="display:none;">
                            <label class="form-label" style="display:block; margin-bottom:0.4rem; font-weight:500; font-size:0.875rem;">Select Course</label>
                            <select id="select-course" class="form-control" style="width:100%; padding:0.6rem; border:1px solid var(--border-color); border-radius:8px;">
                                <option value="">-- Select Course --</option>
                            </select>
                        </div>
                        <div id="option-selection-wrap" style="display:none;">
                            <label class="form-label" style="display:block; margin-bottom:0.4rem; font-weight:500; font-size:0.875rem;">Select Specific Quota & Category</label>
                            <select id="select-option" class="form-control" style="width:100%; padding:0.6rem; border:1px solid var(--border-color); border-radius:8px;">
                                <option value="">-- Select Option --</option>
                            </select>
                        </div>
                    </div>

                    <!-- Tab 2: Direct Option ID Lookup -->
                    <div id="tab-panel-optionid" style="display:none; max-width:500px;">
                        <label class="form-label" style="display:block; margin-bottom:0.4rem; font-weight:500; font-size:0.875rem;">Enter Unique Option ID</label>
                        <div style="display:flex; gap:0.5rem;">
                            <input type="number" id="input-direct-option-id" class="form-control" placeholder="e.g. 512511" style="flex:1; padding:0.6rem; border:1px solid var(--border-color); border-radius:8px;">
                            <button type="button" id="btn-fetch-direct" class="btn btn-primary" style="padding:0.6rem 1.25rem; font-weight:500; white-space:nowrap;">Load Record</button>
                        </div>
                        <p class="text-muted text-sm" style="margin-top:0.4rem; font-size:0.8rem;">Every choice in NEET-PG has a permanent numeric option ID.</p>
                    </div>

                    <div id="loading-target-spinner" style="display:none; margin-top:1rem; align-items:center; gap:0.5rem; color:var(--text-muted); font-size:0.875rem;">
                        <span class="spinner" style="width:16px; height:16px; display:inline-block;"></span> Loading data point details...
                    </div>
                </div>

                <!-- Main Data Point Editor -->
                <div id="editor-form" style="display:none;">
                    <!-- Record Info Banner -->
                    <div id="record-summary-banner" style="background:var(--bg-surface); padding:1.25rem 1.5rem; border-radius:10px; border:1px solid var(--border-color); border-left:4px solid var(--primary-color); margin-bottom:1.5rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
                        <div>
                            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.25rem;">
                                <span id="badge-option-id" class="badge" style="background:var(--primary-color); color:white; padding:0.25rem 0.6rem; border-radius:4px; font-weight:600; font-size:0.85rem;">Option #...</span>
                                <span id="badge-counselling" class="badge" style="background:var(--bg-main); color:var(--text); border:1px solid var(--border-color); padding:0.25rem 0.6rem; border-radius:4px; font-weight:500; font-size:0.85rem;">Counselling</span>
                                <span id="badge-state" class="badge" style="background:var(--bg-main); color:var(--text); border:1px solid var(--border-color); padding:0.25rem 0.6rem; border-radius:4px; font-weight:500; font-size:0.85rem;">State</span>
                            </div>
                            <h3 id="record-title" style="margin:0; font-size:1.15rem; font-weight:600; color:var(--text);">Course Name at College Name</h3>
                            <p id="record-subtitle" style="margin:0.2rem 0 0 0; color:var(--text-muted); font-size:0.875rem;">Quota: ... | Category: ...</p>
                        </div>

                        <!-- Editor View Switcher -->
                        <div style="display:flex; background:var(--bg-main); border:1px solid var(--border-color); border-radius:8px; padding:2px;">
                            <button type="button" id="btn-view-form" class="btn" style="padding:0.35rem 0.75rem; font-size:0.8rem; font-weight:600; background:white; border-radius:6px; box-shadow:var(--shadow-sm); border:none;">
                                📋 Form View
                            </button>
                            <button type="button" id="btn-view-json" class="btn text-muted" style="padding:0.35rem 0.75rem; font-size:0.8rem; font-weight:500; background:transparent; border:none;">
                                💻 Raw JSON Editor
                            </button>
                        </div>
                    </div>

                    <!-- View A: Structured Form -->
                    <div id="structured-form-view">
                        <!-- Section 1: College & Entity -->
                        <div class="card" style="background:var(--bg-surface); padding:1.5rem; border-radius:10px; border:1px solid var(--border-color); margin-bottom:1.5rem;">
                            <h3 style="margin:0 0 1rem 0; font-size:1rem; font-weight:600; color:var(--primary-color); display:flex; align-items:center; gap:0.5rem;">
                                <span>🏛️</span> College & Capacity
                            </h3>
                            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:1rem;">
                                <div style="grid-column:1 / -1;">
                                    <label class="form-label text-sm">College Name</label>
                                    <input type="text" id="input-inst-name" class="form-control" placeholder="Full College Name">
                                </div>
                                <div>
                                    <label class="form-label text-sm">College Short Name</label>
                                    <input type="text" id="input-inst-short" class="form-control" placeholder="e.g. GMC Amritsar">
                                </div>
                                <div>
                                    <label class="form-label text-sm">State</label>
                                    <input type="text" id="input-state" class="form-control" placeholder="e.g. Punjab">
                                </div>
                                <div>
                                    <label class="form-label text-sm">District</label>
                                    <input type="text" id="input-district" class="form-control" placeholder="e.g. Amritsar">
                                </div>
                                <div>
                                    <label class="form-label text-sm">Hospital Beds Capacity</label>
                                    <input type="text" id="input-beds" class="form-control" placeholder="e.g. 1500">
                                </div>
                            </div>
                        </div>

                        <!-- Section 2: Course, Quota, Category -->
                        <div class="card" style="background:var(--bg-surface); padding:1.5rem; border-radius:10px; border:1px solid var(--border-color); margin-bottom:1.5rem;">
                            <h3 style="margin:0 0 1rem 0; font-size:1rem; font-weight:600; color:var(--primary-color); display:flex; align-items:center; gap:0.5rem;">
                                <span>🎓</span> Course, Quota & Category
                            </h3>
                            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:1rem;">
                                <div>
                                    <label class="form-label text-sm">Course Name</label>
                                    <input type="text" id="input-course-name" class="form-control" placeholder="e.g. MD General Medicine">
                                </div>
                                <div>
                                    <label class="form-label text-sm">Course Short Name</label>
                                    <input type="text" id="input-course-short" class="form-control" placeholder="e.g. GENERAL MEDICINE">
                                </div>
                                <div>
                                    <label class="form-label text-sm">Quota Name</label>
                                    <input type="text" id="input-quota-name" class="form-control" placeholder="e.g. All India Quota">
                                </div>
                                <div>
                                    <label class="form-label text-sm">Quota Short Name</label>
                                    <input type="text" id="input-quota-short" class="form-control" placeholder="e.g. AIQ">
                                </div>
                                <div>
                                    <label class="form-label text-sm">Master Quota</label>
                                    <input type="text" id="input-master-quota" class="form-control" placeholder="e.g. AIQ">
                                </div>
                                <div>
                                    <label class="form-label text-sm">Category</label>
                                    <input type="text" id="input-category" class="form-control" placeholder="e.g. GEN, OBC, SC, ST, EWS">
                                </div>
                            </div>
                        </div>

                        <!-- Section 3: Fees -->
                        <div class="card" style="background:var(--bg-surface); padding:1.5rem; border-radius:10px; border:1px solid var(--border-color); margin-bottom:1.5rem;">
                            <h3 style="margin:0 0 1rem 0; font-size:1rem; font-weight:600; color:var(--primary-color); display:flex; align-items:center; gap:0.5rem;">
                                <span>💰</span> Financials & Fees (INR)
                            </h3>
                            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:1rem;">
                                <div>
                                    <label class="form-label text-sm">Annual Tuition Fee (Raw String)</label>
                                    <input type="text" id="input-tuition-raw" class="form-control" placeholder="e.g. ₹1,25,000* or 125000">
                                </div>
                                <div>
                                    <label class="form-label text-sm">Total Course Fee</label>
                                    <input type="number" id="input-total-fee" class="form-control" placeholder="e.g. 375000" min="0">
                                </div>
                                <div>
                                    <label class="form-label text-sm">Hostel Fee (Annual)</label>
                                    <input type="number" id="input-hostel" class="form-control" placeholder="e.g. 50000" min="0">
                                </div>
                                <div>
                                    <label class="form-label text-sm">Other Mandatory Fees</label>
                                    <input type="number" id="input-other-fee" class="form-control" placeholder="e.g. 20000" min="0">
                                </div>
                                <div>
                                    <label class="form-label text-sm">Fee Schedule ID (Optional)</label>
                                    <input type="number" id="input-fee-id" class="form-control" placeholder="e.g. 1143894">
                                </div>
                            </div>
                        </div>

                        <!-- Section 4: Stipend & Duration -->
                        <div class="card" style="background:var(--bg-surface); padding:1.5rem; border-radius:10px; border:1px solid var(--border-color); margin-bottom:1.5rem;">
                            <h3 style="margin:0 0 1rem 0; font-size:1rem; font-weight:600; color:var(--primary-color); display:flex; align-items:center; gap:0.5rem;">
                                <span>🩺</span> Stipend & Course Duration
                            </h3>
                            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:1rem;">
                                <div>
                                    <label class="form-label text-sm">Monthly Stipend Year 1 (Raw String)</label>
                                    <input type="text" id="input-stipend-raw" class="form-control" placeholder="e.g. ₹76,000*">
                                </div>
                                <div>
                                    <label class="form-label text-sm">Course Duration (Months)</label>
                                    <input type="number" id="input-duration" class="form-control" placeholder="e.g. 36" min="0">
                                </div>
                            </div>
                        </div>

                        <!-- Section 5: Bond -->
                        <div class="card" style="background:var(--bg-surface); padding:1.5rem; border-radius:10px; border:1px solid var(--border-color); margin-bottom:1.5rem;">
                            <h3 style="margin:0 0 1rem 0; font-size:1rem; font-weight:600; color:var(--primary-color); display:flex; align-items:center; gap:0.5rem;">
                                <span>📜</span> Bond & Service Conditions
                            </h3>
                            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:1rem;">
                                <div>
                                    <label class="form-label text-sm">Bond Required?</label>
                                    <select id="input-bond-req" class="form-control">
                                        <option value="">(Leave unchanged)</option>
                                        <option value="YES">Yes</option>
                                        <option value="NO">No</option>
                                        <option value="UNKNOWN">Unknown</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="form-label text-sm">Bond Duration Years (Raw)</label>
                                    <input type="text" id="input-bond-years-raw" class="form-control" placeholder="e.g. 2* or 1">
                                </div>
                                <div>
                                    <label class="form-label text-sm">Bond Penalty (Raw)</label>
                                    <input type="text" id="input-bond-penalty-raw" class="form-control" placeholder="e.g. ₹50,00,000*">
                                </div>
                                <div style="grid-column:1 / -1;">
                                    <label class="form-label text-sm">Bond Details / Terms</label>
                                    <input type="text" id="input-bond-details" class="form-control" placeholder="e.g. 2 years compulsory rural service">
                                </div>
                            </div>
                        </div>

                        <!-- Section 6: Historical Cutoffs Manager -->
                        <div class="card" style="background:var(--bg-surface); padding:1.5rem; border-radius:10px; border:1px solid var(--border-color); margin-bottom:1.5rem;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem;">
                                <h3 style="margin:0; font-size:1rem; font-weight:600; color:var(--primary-color); display:flex; align-items:center; gap:0.5rem;">
                                    <span>📊</span> Historical Cutoffs (by Session & Round)
                                </h3>
                                <button type="button" id="btn-add-cutoff" class="btn btn-outline" style="padding:0.25rem 0.75rem; font-size:0.8rem; font-weight:500;">
                                    + Add New Round Cutoff
                                </button>
                            </div>
                            <p class="text-muted text-sm" style="margin-top:0; margin-bottom:1rem; font-size:0.85rem;">
                                Edit existing round cutoffs (Closing Rank, State/Counselling Rank, AIR, Allotments count) or add new rounds.
                            </p>
                            <div id="cutoffs-list-container" style="display:flex; flex-direction:column; gap:0.75rem;">
                                <!-- Injected dynamically -->
                            </div>
                        </div>

                        <!-- Section 7: Source & Remarks -->
                        <div class="card" style="background:var(--bg-surface); padding:1.5rem; border-radius:10px; border:1px solid var(--border-color); margin-bottom:1.5rem;">
                            <h3 style="margin:0 0 1rem 0; font-size:1rem; font-weight:600; color:var(--primary-color); display:flex; align-items:center; gap:0.5rem;">
                                <span>🔗</span> Metadata & Source Information
                            </h3>
                            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:1rem;">
                                <div style="grid-column:1 / -1;">
                                    <label class="form-label text-sm">Remarks / Notes</label>
                                    <textarea id="input-remarks" class="form-control" rows="2" placeholder="Any special notes or verification remarks..."></textarea>
                                </div>
                                <div>
                                    <label class="form-label text-sm">Source Label</label>
                                    <input type="text" id="input-source-label" class="form-control" placeholder="e.g. DME Official Notification 2025">
                                </div>
                                <div>
                                    <label class="form-label text-sm">Source URL</label>
                                    <input type="url" id="input-source-url" class="form-control" placeholder="https://...">
                                </div>
                                <div>
                                    <label class="form-label text-sm">Choice List Count (Popularity)</label>
                                    <input type="number" id="input-choice-count" class="form-control" min="0" placeholder="0">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- View B: Raw JSON Editor -->
                    <div id="raw-json-view" style="display:none;">
                        <div class="card" style="background:var(--bg-surface); padding:1.5rem; border-radius:10px; border:1px solid var(--border-color); margin-bottom:1.5rem;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                                <h3 style="margin:0; font-size:1rem; font-weight:600;">Raw JSON Record</h3>
                                <button type="button" id="btn-format-json" class="btn btn-outline" style="padding:0.25rem 0.75rem; font-size:0.8rem;">
                                    Format & Validate JSON
                                </button>
                            </div>
                            <textarea id="raw-json-textarea" class="form-control" style="width:100%; min-height:450px; font-family:monospace; font-size:0.85rem; line-height:1.4; padding:0.75rem; background:#1e1e1e; color:#d4d4d4; border-radius:6px;"></textarea>
                            <div id="json-syntax-error" class="text-danger text-sm mt-2" style="display:none;"></div>
                        </div>
                    </div>

                    <!-- Save & Status Actions -->
                    <div style="background:var(--bg-surface); padding:1.25rem 1.5rem; border-radius:10px; border:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
                        <div id="status-message" style="font-weight:500; font-size:0.95rem;"></div>
                        <div style="display:flex; gap:1rem; align-items:center;">
                            <button type="button" id="btn-reload-record" class="btn btn-outline" style="padding:0.6rem 1.25rem; font-weight:500;">Discard Changes</button>
                            <button type="button" id="btn-save" class="btn btn-primary" style="padding:0.6rem 2rem; font-weight:600; font-size:1rem;">Save All Changes to Source</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // DOM References
    const authSection = container.querySelector('#auth-section');
    const editorContainer = container.querySelector('#editor-container');
    const statusMsg = container.querySelector('#status-message');

    const selectCounselling = container.querySelector('#select-counselling');
    const selectCollege = container.querySelector('#select-college');
    const selectScope = container.querySelector('#select-scope');
    const selectCourse = container.querySelector('#select-course');
    const selectOption = container.querySelector('#select-option');
    const courseSectionWrap = container.querySelector('#course-selection-wrap');
    const optionSectionWrap = container.querySelector('#option-selection-wrap');
    const loadingSpinner = container.querySelector('#loading-target-spinner');

    const tabBtnHierarchical = container.querySelector('#tab-btn-hierarchical');
    const tabBtnOptionId = container.querySelector('#tab-btn-optionid');
    const tabPanelHierarchical = container.querySelector('#tab-panel-hierarchical');
    const tabPanelOptionId = container.querySelector('#tab-panel-optionid');
    const inputDirectOptionId = container.querySelector('#input-direct-option-id');
    const btnFetchDirect = container.querySelector('#btn-fetch-direct');

    const editorForm = container.querySelector('#editor-form');
    const structuredFormView = container.querySelector('#structured-form-view');
    const rawJsonView = container.querySelector('#raw-json-view');
    const btnViewForm = container.querySelector('#btn-view-form');
    const btnViewJson = container.querySelector('#btn-view-json');
    const rawJsonTextarea = container.querySelector('#raw-json-textarea');
    const jsonSyntaxError = container.querySelector('#json-syntax-error');
    const btnFormatJson = container.querySelector('#btn-format-json');

    const badgeOptionId = container.querySelector('#badge-option-id');
    const badgeCounselling = container.querySelector('#badge-counselling');
    const badgeState = container.querySelector('#badge-state');
    const recordTitle = container.querySelector('#record-title');
    const recordSubtitle = container.querySelector('#record-subtitle');
    const cutoffsListContainer = container.querySelector('#cutoffs-list-container');
    const btnAddCutoff = container.querySelector('#btn-add-cutoff');
    const btnSave = container.querySelector('#btn-save');
    const btnReloadRecord = container.querySelector('#btn-reload-record');

    function showStatus(msg, isError = false) {
        statusMsg.textContent = msg;
        statusMsg.style.color = isError ? 'var(--danger)' : 'var(--success)';
        if (!isError) {
            setTimeout(() => { if (statusMsg.textContent === msg) statusMsg.textContent = ''; }, 8000);
        }
    }

    // ---------------------------------------------------------------------------
    // Auth Check
    // ---------------------------------------------------------------------------
    async function checkAuth() {
        try {
            const res = await fetch('/api/check-auth');
            const data = await res.json();
            isAuthenticated = data.isAuthenticated;
            renderAuthUI();
            if (isAuthenticated) {
                editorContainer.style.display = 'block';
                await loadCounsellings();
            } else {
                editorContainer.style.display = 'none';
            }
        } catch (e) {
            authSection.innerHTML = `<div class="text-danger">Failed to connect to backend API.</div>`;
        }
    }

    function renderAuthUI() {
        if (isAuthenticated) {
            authSection.innerHTML = `
                <div style="display:flex; align-items:center; gap:0.75rem; color:var(--success);">
                    <span style="font-weight:600; font-size:0.9rem;">✓ Admin Mode Active</span>
                    <button id="btn-logout" class="btn btn-outline" style="padding:0.25rem 0.6rem; font-size:0.8rem;">Logout</button>
                </div>
            `;
            container.querySelector('#btn-logout').addEventListener('click', async () => {
                await fetch('/api/logout', { method: 'POST' });
                checkAuth();
            });
        } else {
            authSection.innerHTML = `
                <div style="display:flex; gap:0.5rem; max-width:320px;">
                    <input type="password" id="input-password" class="form-control" placeholder="Admin Password" style="padding:0.4rem 0.6rem; font-size:0.85rem;">
                    <button id="btn-login" class="btn btn-primary" style="padding:0.4rem 0.8rem; font-size:0.85rem; font-weight:600;">Login</button>
                </div>
                <div id="login-error" class="text-danger text-sm mt-1" style="font-size:0.8rem;"></div>
            `;
            container.querySelector('#btn-login').addEventListener('click', async () => {
                const pwd = container.querySelector('#input-password').value;
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: pwd })
                });
                if (res.ok) {
                    checkAuth();
                } else {
                    container.querySelector('#login-error').textContent = 'Invalid password.';
                }
            });
        }
    }

    // ---------------------------------------------------------------------------
    // Counselling and College Hierarchy Loading
    // ---------------------------------------------------------------------------
    async function loadCounsellings() {
        try {
            const res = await fetch('/api/counsellings');
            const data = await res.json();
            if (data.success && data.counsellings) {
                selectCounselling.innerHTML = '';
                data.counsellings.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c;
                    opt.textContent = c.replace(/_/g, ' ');
                    if (c === currentCounselling) opt.selected = true;
                    selectCounselling.appendChild(opt);
                });
            }
            await loadCollegesForCounselling(selectCounselling.value);
        } catch (err) {
            console.error('Failed to load counsellings:', err);
        }
    }

    async function loadCollegesForCounselling(counselling) {
        currentCounselling = counselling;
        selectCollege.innerHTML = '<option value="">-- Loading colleges... --</option>';
        selectScope.disabled = true;
        courseSectionWrap.style.display = 'none';
        optionSectionWrap.style.display = 'none';
        editorForm.style.display = 'none';

        try {
            const res = await fetch(`/api/${encodeURIComponent(counselling)}/filter-metadata`);
            const meta = await res.json();
            if (meta && meta.institutes) {
                const sorted = [...meta.institutes].sort((a, b) => a.name.localeCompare(b.name));
                selectCollege.innerHTML = '<option value="">-- Select College --</option>';
                sorted.forEach(inst => {
                    const opt = document.createElement('option');
                    opt.value = inst.id;
                    opt.textContent = `${inst.name} (${inst.state || 'N/A'})`;
                    selectCollege.appendChild(opt);
                });
            }
        } catch (e) {
            selectCollege.innerHTML = '<option value="">-- Failed to load colleges --</option>';
        }
    }

    selectCounselling.addEventListener('change', async (e) => {
        await loadCollegesForCounselling(e.target.value);
    });

    // ---------------------------------------------------------------------------
    // Tab switching (Browse vs Option ID)
    // ---------------------------------------------------------------------------
    tabBtnHierarchical.addEventListener('click', () => {
        tabBtnHierarchical.style.borderBottom = '2px solid var(--primary-color)';
        tabBtnHierarchical.classList.remove('text-muted');
        tabBtnHierarchical.style.fontWeight = '600';
        tabBtnOptionId.style.borderBottom = '2px solid transparent';
        tabBtnOptionId.classList.add('text-muted');
        tabBtnOptionId.style.fontWeight = '500';
        tabPanelHierarchical.style.display = 'grid';
        tabPanelOptionId.style.display = 'none';
    });

    tabBtnOptionId.addEventListener('click', () => {
        tabBtnOptionId.style.borderBottom = '2px solid var(--primary-color)';
        tabBtnOptionId.classList.remove('text-muted');
        tabBtnOptionId.style.fontWeight = '600';
        tabBtnHierarchical.style.borderBottom = '2px solid transparent';
        tabBtnHierarchical.classList.add('text-muted');
        tabBtnHierarchical.style.fontWeight = '500';
        tabPanelOptionId.style.display = 'block';
        tabPanelHierarchical.style.display = 'none';
    });

    // ---------------------------------------------------------------------------
    // College Selection & Hierarchy Loading
    // ---------------------------------------------------------------------------
    selectCollege.addEventListener('change', async (e) => {
        const instId = e.target.value;
        selectScope.value = 'option';
        courseSectionWrap.style.display = 'none';
        optionSectionWrap.style.display = 'none';
        editorForm.style.display = 'none';
        currentRecord = null;

        if (!instId) {
            selectScope.disabled = true;
            return;
        }

        loadingSpinner.style.display = 'flex';
        try {
            const res = await fetch(`/api/admin/college-hierarchy?counselling=${encodeURIComponent(currentCounselling)}&instituteId=${instId}`);
            const data = await res.json();
            if (data.success) {
                loadedCourses = data.courses || [];
                loadedOptions = data.options || [];

                selectCourse.innerHTML = '<option value="">-- Select Course --</option>';
                loadedCourses.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.id;
                    opt.textContent = c.name;
                    selectCourse.appendChild(opt);
                });

                selectScope.disabled = false;
                courseSectionWrap.style.display = 'block';
            }
        } catch (err) {
            console.error('Failed to load college hierarchy', err);
        } finally {
            loadingSpinner.style.display = 'none';
        }
    });

    selectScope.addEventListener('change', (e) => {
        const scope = e.target.value;
        if (scope === 'college') {
            courseSectionWrap.style.display = 'none';
            optionSectionWrap.style.display = 'none';
            // Load college-wide representative record or template
            loadCollegeWideRecord(parseInt(selectCollege.value));
        } else if (scope === 'course') {
            courseSectionWrap.style.display = 'block';
            optionSectionWrap.style.display = 'none';
            if (selectCourse.value) {
                loadCourseWideRecord(parseInt(selectCollege.value), parseInt(selectCourse.value));
            }
        } else { // 'option'
            courseSectionWrap.style.display = 'block';
            if (selectCourse.value) {
                populateOptionsForCourse(parseInt(selectCourse.value));
                optionSectionWrap.style.display = 'block';
            }
        }
    });

    selectCourse.addEventListener('change', async (e) => {
        const courseId = parseInt(e.target.value);
        if (!courseId) {
            optionSectionWrap.style.display = 'none';
            editorForm.style.display = 'none';
            return;
        }

        const scope = selectScope.value;
        if (scope === 'course') {
            await loadCourseWideRecord(parseInt(selectCollege.value), courseId);
        } else if (scope === 'option') {
            populateOptionsForCourse(courseId);
            optionSectionWrap.style.display = 'block';
            // Auto-load first option if available
            if (selectOption.options.length > 1) {
                selectOption.selectedIndex = 1;
                await fetchAndPopulateRecord(parseInt(selectOption.value));
            }
        }
    });

    function populateOptionsForCourse(courseId) {
        const filtered = loadedOptions.filter(o => o.courseId === courseId);
        selectOption.innerHTML = '<option value="">-- Select Option / Data Point --</option>';
        filtered.forEach(o => {
            const opt = document.createElement('option');
            opt.value = o.id;
            opt.textContent = `Option #${o.id} | ${o.quotaShort || o.quotaName} | ${o.category}`;
            selectOption.appendChild(opt);
        });
    }

    selectOption.addEventListener('change', async (e) => {
        const optId = parseInt(e.target.value);
        if (optId) {
            await fetchAndPopulateRecord(optId);
        } else {
            editorForm.style.display = 'none';
        }
    });

    // ---------------------------------------------------------------------------
    // Direct Option ID Fetch
    // ---------------------------------------------------------------------------
    btnFetchDirect.addEventListener('click', async () => {
        const optId = parseInt(inputDirectOptionId.value.trim());
        if (!optId) {
            alert('Please enter a valid Option ID number.');
            return;
        }
        await fetchAndPopulateRecord(optId);
    });

    inputDirectOptionId.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            btnFetchDirect.click();
        }
    });

    // ---------------------------------------------------------------------------
    // Fetch & Populate Complete Record
    // ---------------------------------------------------------------------------
    async function fetchAndPopulateRecord(optionId) {
        loadingSpinner.style.display = 'flex';
        try {
            const res = await fetch(`/api/admin/record?counselling=${encodeURIComponent(currentCounselling)}&optionId=${optionId}`);
            const data = await res.json();
            if (!res.ok || !data.success || !data.record) {
                alert(`Option #${optionId} not found in ${currentCounselling} counselling.`);
                return;
            }

            currentRecord = data.record;
            populateFormWithRecord(currentRecord);
            editorForm.style.display = 'block';
            editorForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (err) {
            console.error('Failed to fetch record:', err);
            alert('Error loading record details.');
        } finally {
            loadingSpinner.style.display = 'none';
        }
    }

    async function loadCourseWideRecord(instId, courseId) {
        loadingSpinner.style.display = 'flex';
        try {
            const res = await fetch(`/api/admin/record?counselling=${encodeURIComponent(currentCounselling)}&instituteId=${instId}&courseId=${courseId}`);
            const data = await res.json();
            if (data.records && data.records.length > 0) {
                currentRecord = data.records[0];
                populateFormWithRecord(currentRecord, `Batch Update (${data.records.length} options)`);
                editorForm.style.display = 'block';
            }
        } catch (e) {
            console.error('Failed to load course record', e);
        } finally {
            loadingSpinner.style.display = 'none';
        }
    }

    async function loadCollegeWideRecord(instId) {
        loadingSpinner.style.display = 'flex';
        try {
            const res = await fetch(`/api/admin/record?counselling=${encodeURIComponent(currentCounselling)}&instituteId=${instId}`);
            const data = await res.json();
            if (data.records && data.records.length > 0) {
                currentRecord = data.records[0];
                populateFormWithRecord(currentRecord, `College-Wide Batch Update (${data.records.length} options)`);
                editorForm.style.display = 'block';
            }
        } catch (e) {
            console.error('Failed to load college record', e);
        } finally {
            loadingSpinner.style.display = 'none';
        }
    }

    // ---------------------------------------------------------------------------
    // Populate Form Fields
    // ---------------------------------------------------------------------------
    function populateFormWithRecord(rec, customScopeLabel = null) {
        badgeOptionId.textContent = customScopeLabel || `Option #${rec.id}`;
        badgeCounselling.textContent = (rec.counselling?.name || currentCounselling);
        badgeState.textContent = (rec.state || 'State N/A');
        recordTitle.textContent = `${rec.course?.name || 'N/A'} at ${rec.institute?.name || 'N/A'}`;
        recordSubtitle.textContent = `Quota: ${rec.quota?.name || 'N/A'} (${rec.quota?.short_name || ''}) | Category: ${rec.category || 'N/A'}`;

        // Section 1: Institute
        container.querySelector('#input-inst-name').value = rec.institute?.name || '';
        container.querySelector('#input-inst-short').value = rec.institute?.short_name || '';
        container.querySelector('#input-state').value = rec.state || '';
        container.querySelector('#input-district').value = rec.institute?.district || '';
        container.querySelector('#input-beds').value = rec.beds || '';

        // Section 2: Course & Quota
        container.querySelector('#input-course-name').value = rec.course?.name || '';
        container.querySelector('#input-course-short').value = rec.course?.short_name || '';
        container.querySelector('#input-quota-name').value = rec.quota?.name || '';
        container.querySelector('#input-quota-short').value = rec.quota?.short_name || '';
        container.querySelector('#input-master-quota').value = rec.quota?.master_quota || '';
        container.querySelector('#input-category').value = rec.category || '';

        // Section 3: Financials
        container.querySelector('#input-tuition-raw').value = rec.fee !== undefined ? rec.fee : '';
        container.querySelector('#input-total-fee').value = rec.fee_total !== null && rec.fee_total !== undefined ? rec.fee_total : '';
        container.querySelector('#input-hostel').value = rec.fee_hostel !== null && rec.fee_hostel !== undefined ? rec.fee_hostel : '';
        container.querySelector('#input-other-fee').value = rec.fee_other !== null && rec.fee_other !== undefined ? rec.fee_other : '';
        container.querySelector('#input-fee-id').value = rec.fee_id !== null && rec.fee_id !== undefined ? rec.fee_id : '';

        // Section 4: Stipend & Duration
        container.querySelector('#input-stipend-raw').value = rec.stipend_year_1 !== undefined ? rec.stipend_year_1 : '';
        container.querySelector('#input-duration').value = rec.course_duration_months !== null && rec.course_duration_months !== undefined ? rec.course_duration_months : '';

        // Section 5: Bond
        const bondReq = String(rec.bond_required || '').toUpperCase();
        container.querySelector('#input-bond-req').value = (bondReq === 'YES' || bondReq === 'NO' || bondReq === 'UNKNOWN') ? bondReq : '';
        container.querySelector('#input-bond-years-raw').value = rec.bond_years !== undefined ? rec.bond_years : '';
        container.querySelector('#input-bond-penalty-raw').value = rec.bond_penalty !== undefined ? rec.bond_penalty : '';
        container.querySelector('#input-bond-details').value = rec.bond_details || '';

        // Section 6: Cutoffs
        renderCutoffsList(rec);

        // Section 7: Metadata & Remarks
        container.querySelector('#input-remarks').value = rec.remarks || '';
        container.querySelector('#input-source-label').value = rec.source_label || '';
        container.querySelector('#input-source-url').value = rec.source_url || '';
        container.querySelector('#input-choice-count').value = rec.choice_list_count !== undefined ? rec.choice_list_count : 0;

        // Raw JSON Textarea
        rawJsonTextarea.value = JSON.stringify(rec, null, 2);
        jsonSyntaxError.style.display = 'none';
    }

    // ---------------------------------------------------------------------------
    // Cutoffs Manager
    // ---------------------------------------------------------------------------
    function renderCutoffsList(rec) {
        cutoffsListContainer.innerHTML = '';
        const crKeys = Object.keys(rec).filter(k => k.startsWith('cr_')).sort();

        if (crKeys.length === 0) {
            cutoffsListContainer.innerHTML = '<div class="text-muted text-sm p-3" style="background:var(--bg-main); border-radius:6px;">No cutoff records exist yet for this option. Click "+ Add New Round Cutoff" above to add one.</div>';
            return;
        }

        crKeys.forEach(k => {
            const co = rec[k] || {};
            const parts = k.split('_');
            const year = parts[1] || '2025';
            const round = parts[2] || '1';

            const card = document.createElement('div');
            card.className = 'cutoff-round-card';
            card.dataset.cutoffKey = k;
            card.style.cssText = 'background:var(--bg-main); border:1px solid var(--border-color); border-radius:8px; padding:0.85rem;';

            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.6rem;">
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                        <span class="badge" style="background:var(--primary-color); color:white; font-weight:600; padding:0.2rem 0.5rem; border-radius:4px; font-size:0.8rem;">${k}</span>
                        <strong style="font-size:0.9rem;">Year ${year} - Round ${round}</strong>
                    </div>
                    <button type="button" class="btn btn-outline btn-remove-cutoff" style="padding:0.15rem 0.5rem; font-size:0.75rem; color:var(--danger); border-color:var(--danger);">Delete</button>
                </div>
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:0.6rem;">
                    <div>
                        <label class="form-label text-sm" style="font-size:0.75rem; margin-bottom:0.2rem;">Closing Rank</label>
                        <input type="number" class="form-control cr-input-closing" value="${co.closing_rank !== undefined && co.closing_rank !== null ? co.closing_rank : ''}" placeholder="Closing Rank" style="padding:0.4rem; font-size:0.85rem;">
                    </div>
                    <div>
                        <label class="form-label text-sm" style="font-size:0.75rem; margin-bottom:0.2rem;">All India Rank (AIR)</label>
                        <input type="number" class="form-control cr-input-air" value="${co.ai_rank !== undefined && co.ai_rank !== null ? co.ai_rank : ''}" placeholder="AIR" style="padding:0.4rem; font-size:0.85rem;">
                    </div>
                    <div>
                        <label class="form-label text-sm" style="font-size:0.75rem; margin-bottom:0.2rem;">State/Counselling Rank</label>
                        <input type="number" class="form-control cr-input-counselling" value="${co.counselling_rank !== undefined && co.counselling_rank !== null ? co.counselling_rank : ''}" placeholder="State Rank" style="padding:0.4rem; font-size:0.85rem;">
                    </div>
                    <div>
                        <label class="form-label text-sm" style="font-size:0.75rem; margin-bottom:0.2rem;">Allotments Count</label>
                        <input type="number" class="form-control cr-input-allotments" value="${co.allotments_count !== undefined && co.allotments_count !== null ? co.allotments_count : 1}" placeholder="Allotments" style="padding:0.4rem; font-size:0.85rem;">
                    </div>
                    <div>
                        <label class="form-label text-sm" style="font-size:0.75rem; margin-bottom:0.2rem;">In-Service Candidate</label>
                        <select class="form-control cr-input-inservice" style="padding:0.4rem; font-size:0.85rem;">
                            <option value="false" ${co.inservice_candidate ? '' : 'selected'}>No</option>
                            <option value="true" ${co.inservice_candidate ? 'selected' : ''}>Yes</option>
                        </select>
                    </div>
                </div>
            `;

            card.querySelector('.btn-remove-cutoff').addEventListener('click', () => {
                if (confirm(`Remove cutoff for ${k}?`)) {
                    card.dataset.deleted = 'true';
                    card.style.opacity = '0.4';
                    card.style.textDecoration = 'line-through';
                }
            });

            cutoffsListContainer.appendChild(card);
        });
    }

    btnAddCutoff.addEventListener('click', () => {
        const year = prompt('Enter Year (e.g. 2025 or 2024):', '2025');
        if (!year) return;
        const round = prompt('Enter Round number (e.g. 1, 2, 3, 3.5, 4):', '1');
        if (!round) return;

        const key = `cr_${year}_${round}`;
        const existing = cutoffsListContainer.querySelector(`[data-cutoff-key="${key}"]`);
        if (existing) {
            alert(`Cutoff for ${key} already exists.`);
            return;
        }

        if (!currentRecord) currentRecord = {};
        currentRecord[key] = {
            session: String(year),
            round: String(round),
            closing_rank: null,
            ai_rank: null,
            counselling_rank: null,
            allotments_count: 1,
            inservice_candidate: false,
            candidate_flag: null
        };
        renderCutoffsList(currentRecord);
    });

    // ---------------------------------------------------------------------------
    // View Switcher (Form vs Raw JSON)
    // ---------------------------------------------------------------------------
    btnViewForm.addEventListener('click', () => {
        if (currentEditorMode === 'json') {
            // Sync from JSON to form if valid
            try {
                const parsed = JSON.parse(rawJsonTextarea.value);
                currentRecord = parsed;
                populateFormWithRecord(parsed);
            } catch (err) {
                if (!confirm('The JSON has syntax errors. Discard JSON edits and return to Form View?')) {
                    return;
                }
            }
        }
        currentEditorMode = 'form';
        btnViewForm.style.background = 'white';
        btnViewForm.style.fontWeight = '600';
        btnViewForm.classList.remove('text-muted');
        btnViewJson.style.background = 'transparent';
        btnViewJson.style.fontWeight = '500';
        btnViewJson.classList.add('text-muted');
        structuredFormView.style.display = 'block';
        rawJsonView.style.display = 'none';
    });

    btnViewJson.addEventListener('click', () => {
        // Collect current form values and sync to JSON textarea
        const updated = collectFormValues();
        const merged = { ...currentRecord, ...updated };
        rawJsonTextarea.value = JSON.stringify(merged, null, 2);
        currentEditorMode = 'json';

        btnViewJson.style.background = 'white';
        btnViewJson.style.fontWeight = '600';
        btnViewJson.classList.remove('text-muted');
        btnViewForm.style.background = 'transparent';
        btnViewForm.style.fontWeight = '500';
        btnViewForm.classList.add('text-muted');
        rawJsonView.style.display = 'block';
        structuredFormView.style.display = 'none';
    });

    btnFormatJson.addEventListener('click', () => {
        try {
            const parsed = JSON.parse(rawJsonTextarea.value);
            rawJsonTextarea.value = JSON.stringify(parsed, null, 2);
            jsonSyntaxError.style.display = 'none';
        } catch (e) {
            jsonSyntaxError.textContent = `JSON Syntax Error: ${e.message}`;
            jsonSyntaxError.style.display = 'block';
        }
    });

    // ---------------------------------------------------------------------------
    // Collect Form Values
    // ---------------------------------------------------------------------------
    function collectFormValues() {
        const getVal = (id) => {
            const el = container.querySelector(id);
            return el ? el.value.trim() : '';
        };

        const getNum = (id) => {
            const val = getVal(id);
            return val === '' ? undefined : Number(val);
        };

        const updates = {
            state: getVal('#input-state'),
            beds: getVal('#input-beds'),
            institute: {
                name: getVal('#input-inst-name'),
                short_name: getVal('#input-inst-short'),
                district: getVal('#input-district') || null
            },
            course: {
                name: getVal('#input-course-name'),
                short_name: getVal('#input-course-short')
            },
            quota: {
                name: getVal('#input-quota-name'),
                short_name: getVal('#input-quota-short'),
                master_quota: getVal('#input-master-quota')
            },
            category: getVal('#input-category'),
            fees: {
                feeRaw: getVal('#input-tuition-raw'),
                totalCourse: getNum('#input-total-fee'),
                hostel: getNum('#input-hostel'),
                otherMandatory: getNum('#input-other-fee'),
                feeId: getNum('#input-fee-id')
            },
            stipend: {
                stipendRaw: getVal('#input-stipend-raw')
            },
            courseDurationMonths: getNum('#input-duration'),
            bond: {
                required: getVal('#input-bond-req') || undefined,
                bondYearsRaw: getVal('#input-bond-years-raw'),
                penaltyRaw: getVal('#input-bond-penalty-raw'),
                details: getVal('#input-bond-details')
            },
            remarks: getVal('#input-remarks'),
            source: {
                label: getVal('#input-source-label'),
                url: getVal('#input-source-url')
            },
            choiceListCount: getNum('#input-choice-count'),
            cutoffs: {}
        };

        // Collect Cutoffs
        container.querySelectorAll('.cutoff-round-card').forEach(card => {
            const key = card.dataset.cutoffKey;
            if (card.dataset.deleted === 'true') {
                updates.cutoffs[key] = null; // marks for deletion
            } else {
                const closingRank = card.querySelector('.cr-input-closing').value.trim();
                const air = card.querySelector('.cr-input-air').value.trim();
                const counsRank = card.querySelector('.cr-input-counselling').value.trim();
                const allotments = card.querySelector('.cr-input-allotments').value.trim();
                const inservice = card.querySelector('.cr-input-inservice').value === 'true';

                updates.cutoffs[key] = {
                    closing_rank: closingRank !== '' ? Number(closingRank) : null,
                    ai_rank: air !== '' ? Number(air) : null,
                    counselling_rank: counsRank !== '' ? Number(counsRank) : null,
                    allotments_count: allotments !== '' ? Number(allotments) : 1,
                    inservice_candidate: inservice
                };
            }
        });

        return updates;
    }

    // Discard & Reload
    btnReloadRecord.addEventListener('click', () => {
        if (currentRecord) {
            populateFormWithRecord(currentRecord);
            showStatus('Changes reverted to original record values.');
        }
    });

    // ---------------------------------------------------------------------------
    // Save All Changes
    // ---------------------------------------------------------------------------
    btnSave.addEventListener('click', async () => {
        if (!currentRecord && !selectCollege.value) {
            alert('No record selected to update.');
            return;
        }

        const scope = selectScope.value || 'option';
        const instId = selectCollege.value ? parseInt(selectCollege.value) : currentRecord?.institute?.id;
        const courseId = selectCourse.value ? parseInt(selectCourse.value) : currentRecord?.course?.id;
        const optionId = currentRecord?.id;

        if (scope === 'college') {
            const confirmed = confirm(`WARNING: You are about to perform a COLLEGE-WIDE update affecting all courses at this college. Proceed?`);
            if (!confirmed) return;
        }

        let payload = {
            counselling: currentCounselling,
            scope,
            instituteId: instId,
            courseId: courseId,
            optionId: optionId
        };

        if (currentEditorMode === 'json') {
            try {
                const parsed = JSON.parse(rawJsonTextarea.value);
                payload.rawRecord = parsed;
            } catch (e) {
                alert(`Cannot save: Invalid JSON in editor:\n${e.message}`);
                return;
            }
        } else {
            payload.updates = collectFormValues();
        }

        try {
            btnSave.disabled = true;
            btnSave.textContent = 'Saving & Rebuilding Relational Data...';

            const res = await fetch('/api/update-college', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Server error occurred during update.');

            // Clear client search cache
            const { clearSearchCache } = await import('../../engine/cache.js');
            await clearSearchCache();

            showStatus(`✓ Success! Updated ${data.updatedCount} record(s) in ${currentCounselling} and hot-reloaded the data layer.`);

            // Re-fetch record to show updated state
            if (optionId) {
                await fetchAndPopulateRecord(optionId);
            }
        } catch (err) {
            showStatus(`Failed to save: ${err.message}`, true);
        } finally {
            btnSave.disabled = false;
            btnSave.textContent = 'Save All Changes to Source';
        }
    });

    // Initialize Auth
    checkAuth();
}
