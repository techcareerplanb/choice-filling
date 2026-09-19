export function renderUpdateData(container, params) {
    let authChecked = false;
    let isAuthenticated = false;

    container.innerHTML = `
        <div class="container" style="max-width:800px; padding:2rem 1rem;">
            <div style="margin-bottom:2rem; border-bottom:1px solid var(--border-color); padding-bottom:1rem;">
                <h1 style="margin:0 0 0.5rem 0; font-size:2rem; color:var(--text);">Update College Data</h1>
                <p style="margin:0; color:var(--text-muted);">
                    Authenticated Editor Area. Saves directly to the original application source data.
                </p>
                <div id="auth-section" style="margin-top:1.5rem;">
                    <!-- Auth UI injected here -->
                </div>
            </div>

            <div id="editor-container" style="display:none;">
                <div style="background:var(--bg-surface); padding:1.5rem; border-radius:8px; border:1px solid var(--border-color); margin-bottom:2rem;">
                    <h2 style="margin:0 0 1rem 0; font-size:1.25rem;">Select Target</h2>
                    <div style="display:flex; flex-direction:column; gap:1rem;">
                        <div>
                            <label class="form-label" style="display:block; margin-bottom:0.5rem; font-weight:500;">College</label>
                            <select id="select-college" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px;">
                                <option value="">-- Select College --</option>
                            </select>
                        </div>
                        <div>
                            <label class="form-label" style="display:block; margin-bottom:0.5rem; font-weight:500;">Scope</label>
                            <select id="select-scope" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px;" disabled>
                                <option value="">-- Select Scope --</option>
                                <option value="course">Course-Specific (Updates Exactly 1 Record)</option>
                                <option value="college">College-Wide (Updates ALL Courses at this College)</option>
                            </select>
                        </div>
                        <div id="course-selection" style="display:none;">
                            <label class="form-label" style="display:block; margin-bottom:0.5rem; font-weight:500;">Course</label>
                            <select id="select-course" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px;">
                                <option value="">-- Select Course --</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div id="editor-form" style="display:none;">
                    <div style="background:var(--bg-surface); padding:1.5rem; border-radius:8px; border:1px solid var(--border-color); margin-bottom:2rem;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                            <h2 style="margin:0; font-size:1.25rem;">Data Entry</h2>
                        </div>

                        <div class="text-sm text-muted mb-4 p-3" style="background:var(--bg-main); border-radius:4px; border:1px solid var(--border-color);">
                            <strong>Note:</strong> Leave fields blank if you do not want to modify them. The backend will preserve existing string formats (e.g. <code>₹69,470*</code>) when updating fields like Annual Tuition unless you explicitly overwrite them with a new number.
                        </div>

                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem;">
                            <!-- Fees -->
                            <div style="grid-column: 1 / -1;"><h3 style="margin:0; font-size:1rem; color:var(--text-muted); border-bottom:1px solid var(--border-color); padding-bottom:0.25rem;">Fees (INR)</h3></div>
                            <div>
                                <label class="form-label text-sm">Annual Tuition Fee</label>
                                <input type="number" id="input-tuition" class="form-control" placeholder="e.g. 500000" min="0">
                            </div>
                            <div>
                                <label class="form-label text-sm">Total Course Fee</label>
                                <input type="number" id="input-total-fee" class="form-control" placeholder="e.g. 1500000" min="0">
                            </div>
                            <div>
                                <label class="form-label text-sm">Hostel Fee (Annual)</label>
                                <input type="number" id="input-hostel" class="form-control" placeholder="e.g. 100000" min="0">
                            </div>
                            <div>
                                <label class="form-label text-sm">Other Mandatory Fees</label>
                                <input type="number" id="input-other-fee" class="form-control" placeholder="e.g. 50000" min="0">
                            </div>

                            <!-- Stipend -->
                            <div style="grid-column: 1 / -1; margin-top:1rem;"><h3 style="margin:0; font-size:1rem; color:var(--text-muted); border-bottom:1px solid var(--border-color); padding-bottom:0.25rem;">Stipend (INR)</h3></div>
                            <div>
                                <label class="form-label text-sm">Monthly Stipend</label>
                                <input type="number" id="input-stipend" class="form-control" placeholder="e.g. 80000" min="0">
                            </div>
                            
                            <!-- Course Duration -->
                            <div>
                                <label class="form-label text-sm">Course Duration (Months)</label>
                                <input type="number" id="input-duration" class="form-control" placeholder="e.g. 36" min="0">
                            </div>

                            <!-- Bond -->
                            <div style="grid-column: 1 / -1; margin-top:1rem;"><h3 style="margin:0; font-size:1rem; color:var(--text-muted); border-bottom:1px solid var(--border-color); padding-bottom:0.25rem;">Bond Details</h3></div>
                            <div>
                                <label class="form-label text-sm">Bond Required?</label>
                                <select id="input-bond-req" class="form-control">
                                    <option value="">(Leave unchanged)</option>
                                    <option value="UNKNOWN">Unknown</option>
                                    <option value="YES">Yes</option>
                                    <option value="NO">No</option>
                                </select>
                            </div>
                            <div>
                                <label class="form-label text-sm">Bond Duration (Months)</label>
                                <input type="number" id="input-bond-months" class="form-control" placeholder="e.g. 12" min="0">
                            </div>
                            <div>
                                <label class="form-label text-sm">Bond Penalty (INR)</label>
                                <input type="number" id="input-bond-penalty" class="form-control" placeholder="e.g. 1000000" min="0">
                            </div>
                            <div>
                                <label class="form-label text-sm">Bond Details / Service</label>
                                <input type="text" id="input-bond-details" class="form-control" placeholder="e.g. 1 year rural service">
                            </div>

                            <!-- Metadata -->
                            <div style="grid-column: 1 / -1; margin-top:1rem;"><h3 style="margin:0; font-size:1rem; color:var(--text-muted); border-bottom:1px solid var(--border-color); padding-bottom:0.25rem;">Source & Remarks</h3></div>
                            <div style="grid-column: 1 / -1;">
                                <label class="form-label text-sm">Remarks</label>
                                <textarea id="input-remarks" class="form-control" rows="2" placeholder="Any additional notes..."></textarea>
                            </div>
                            <div>
                                <label class="form-label text-sm">Source Label</label>
                                <input type="text" id="input-source-label" class="form-control" placeholder="e.g. State Website 2024">
                            </div>
                            <div>
                                <label class="form-label text-sm">Source URL</label>
                                <input type="url" id="input-source-url" class="form-control" placeholder="https://...">
                            </div>
                        </div>

                        <div style="display:flex; justify-content:flex-end; margin-top:2rem; padding-top:1.5rem; border-top:1px solid var(--border-color);">
                            <button id="btn-save" class="btn btn-primary" style="border-radius:4px; font-weight:500; padding:0.5rem 2rem;">Save Updates to Source</button>
                        </div>
                    </div>
                </div>
                
                <div id="status-message" style="margin-bottom:1.5rem; font-weight:500;"></div>
            </div>
        </div>
    `;

    const authSection = container.querySelector('#auth-section');
    const editorContainer = container.querySelector('#editor-container');
    const statusMsg = container.querySelector('#status-message');

    function showStatus(msg, isError = false) {
        statusMsg.textContent = msg;
        statusMsg.style.color = isError ? 'var(--danger)' : 'var(--success)';
        setTimeout(() => { if (statusMsg.textContent === msg) statusMsg.textContent = ''; }, 5000);
    }

    async function checkAuth() {
        try {
            const res = await fetch('/api/check-auth');
            const data = await res.json();
            isAuthenticated = data.isAuthenticated;
            renderAuthUI();
            if (isAuthenticated) {
                editorContainer.style.display = 'block';
                loadColleges();
            } else {
                editorContainer.style.display = 'none';
            }
        } catch (e) {
            authSection.innerHTML = `<div class="text-danger">Failed to connect to backend API. Is the server running?</div>`;
        }
    }

    function renderAuthUI() {
        if (isAuthenticated) {
            authSection.innerHTML = `
                <div style="display:flex; align-items:center; gap:1rem; color:var(--success);">
                    <span style="font-weight:600;">✓ Authenticated as Admin</span>
                    <button id="btn-logout" class="btn btn-outline" style="padding:0.25rem 0.75rem; font-size:0.875rem;">Logout</button>
                </div>
            `;
            container.querySelector('#btn-logout').addEventListener('click', async () => {
                await fetch('/api/logout', { method: 'POST' });
                checkAuth();
            });
        } else {
            authSection.innerHTML = `
                <div style="display:flex; gap:0.5rem; max-width:300px;">
                    <input type="password" id="input-password" class="form-control" placeholder="Admin Password">
                    <button id="btn-login" class="btn btn-primary">Login</button>
                </div>
                <div id="login-error" class="text-danger text-sm mt-2"></div>
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

    checkAuth();

    // Editor Logic
    const selectCollege = container.querySelector('#select-college');
    const selectScope = container.querySelector('#select-scope');
    const selectCourse = container.querySelector('#select-course');
    const courseSection = container.querySelector('#course-selection');
    const editorForm = container.querySelector('#editor-form');
    let loadedCoursesCount = 0;

    function loadColleges() {
        if (window.APP_META && window.APP_META.institutes) {
            const sortedInsts = [...window.APP_META.institutes].sort((a, b) => a.name.localeCompare(b.name));
            selectCollege.innerHTML = '<option value="">-- Select College --</option>';
            sortedInsts.forEach(inst => {
                const opt = document.createElement('option');
                opt.value = inst.id;
                opt.textContent = `${inst.name} (${inst.state || 'N/A'})`;
                selectCollege.appendChild(opt);
            });
        }
    }

    selectCollege.addEventListener('change', async (e) => {
        const instId = e.target.value;
        selectScope.value = '';
        courseSection.style.display = 'none';
        editorForm.style.display = 'none';
        loadedCoursesCount = 0;
        
        if (!instId) {
            selectScope.disabled = true;
            return;
        }

        try {
            const res = await window.DATA_ENGINE.search(null, { institutes: [parseInt(instId)] });
            if (res && res.data) {
                const courseMap = new Map();
                res.data.forEach(opt => {
                    if (!courseMap.has(opt.course.id)) {
                        courseMap.set(opt.course.id, opt.course.name);
                    }
                });
                
                loadedCoursesCount = courseMap.size;
                selectCourse.innerHTML = '<option value="">-- Select Course --</option>';
                const sortedCourses = Array.from(courseMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));
                sortedCourses.forEach(([id, name]) => {
                    const opt = document.createElement('option');
                    opt.value = id;
                    opt.textContent = name;
                    selectCourse.appendChild(opt);
                });
            }
        } catch (err) {
            console.error('Failed to load courses', err);
        }

        selectScope.disabled = false;
    });

    selectScope.addEventListener('change', (e) => {
        const scope = e.target.value;
        if (scope === 'course') {
            courseSection.style.display = 'block';
            editorForm.style.display = selectCourse.value ? 'block' : 'none';
        } else if (scope === 'college') {
            courseSection.style.display = 'none';
            editorForm.style.display = 'block';
        } else {
            courseSection.style.display = 'none';
            editorForm.style.display = 'none';
        }
        resetForm();
    });

    selectCourse.addEventListener('change', () => {
        if (selectCourse.value) {
            editorForm.style.display = 'block';
        } else {
            editorForm.style.display = 'none';
        }
        resetForm();
    });

    function resetForm() {
        container.querySelectorAll('#editor-form input, #editor-form textarea').forEach(el => el.value = '');
        container.querySelector('#input-bond-req').value = '';
    }

    container.querySelector('#btn-save').addEventListener('click', async () => {
        const instId = selectCollege.value;
        const scope = selectScope.value;
        const courseId = selectCourse.value;
        
        if (!instId || !scope) return;
        if (scope === 'course' && !courseId) {
            alert('Please select a course.');
            return;
        }

        if (scope === 'college') {
            const confirmed = confirm(`WARNING: You are about to perform a COLLEGE-WIDE update on approximately ${loadedCoursesCount} courses simultaneously at this college. Proceed?`);
            if (!confirmed) return;
        }

        const getNum = (id) => {
            const val = container.querySelector(id).value;
            return val === '' ? undefined : Number(val);
        };
        const getStr = (id) => {
            const val = container.querySelector(id).value.trim();
            return val === '' ? undefined : val;
        };

        const updateObj = {
            fees: {
                annualTuition: getNum('#input-tuition'),
                totalCourse: getNum('#input-total-fee'),
                hostel: getNum('#input-hostel'),
                otherMandatory: getNum('#input-other-fee')
            },
            stipend: {
                monthly: getNum('#input-stipend')
            },
            courseDurationMonths: getNum('#input-duration'),
            bond: {
                required: getStr('#input-bond-req'),
                durationMonths: getNum('#input-bond-months'),
                penaltyAmount: getNum('#input-bond-penalty'),
                details: getStr('#input-bond-details')
            },
            remarks: getStr('#input-remarks'),
            source: {
                label: getStr('#input-source-label'),
                url: getStr('#input-source-url')
            }
        };

        // Cleanup undefined fields
        Object.keys(updateObj).forEach(k => {
            if (typeof updateObj[k] === 'object') {
                Object.keys(updateObj[k]).forEach(subK => {
                    if (updateObj[k][subK] === undefined) delete updateObj[k][subK];
                });
                if (Object.keys(updateObj[k]).length === 0) delete updateObj[k];
            } else if (updateObj[k] === undefined) {
                delete updateObj[k];
            }
        });

        if (Object.keys(updateObj).length === 0) {
            alert('No fields to update.');
            return;
        }

        try {
            const btn = container.querySelector('#btn-save');
            btn.disabled = true;
            btn.textContent = 'Saving & Rebuilding Data...';

            const res = await fetch('/api/update-college', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instituteId: parseInt(instId),
                    scope,
                    courseId: courseId ? parseInt(courseId) : undefined,
                    updates: updateObj
                })
            });

            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || 'Server error');
            
            const { clearSearchCache } = await import('../../engine/cache.js');
            await clearSearchCache();
            
            showStatus(`Success! Updated ${data.updatedCount} source records and rebuilt processed datasets. Refresh the College Detail page to see the changes.`);
            resetForm();
        } catch (err) {
            showStatus(`Failed: ${err.message}`, true);
        } finally {
            const btn = container.querySelector('#btn-save');
            btn.disabled = false;
            btn.textContent = 'Save Updates to Source';
        }
    });
}
