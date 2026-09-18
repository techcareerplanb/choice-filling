import { CollegeUpdatesStore } from '../../data/CollegeUpdatesStore.js';

export function renderUpdateData(container, params) {
    container.innerHTML = `
        <div class="container" style="max-width:800px; padding:2rem 1rem;">
            <div style="margin-bottom:2rem; border-bottom:1px solid var(--border-color); padding-bottom:1rem;">
                <h1 style="margin:0 0 0.5rem 0; font-size:2rem; color:var(--text);">Update College Data</h1>
                <p style="margin:0; color:var(--text-muted);">
                    These updates are stored only in this browser. Export your updates to back them up or move them to another device.
                </p>
                <div style="display:flex; gap:1rem; margin-top:1rem;">
                    <button id="btn-export" class="btn btn-outline" style="border-radius:4px; font-weight:500;">Export Updates</button>
                    <button id="btn-import-merge" class="btn btn-outline" style="border-radius:4px; font-weight:500;">Import (Merge)</button>
                    <button id="btn-import-replace" class="btn btn-outline" style="border-radius:4px; font-weight:500; color:var(--danger); border-color:var(--danger);">Import (Replace)</button>
                    <button id="btn-clear-all" class="btn btn-outline" style="border-radius:4px; font-weight:500; color:var(--danger); border-color:var(--danger);">Clear All</button>
                    <input type="file" id="file-import" accept=".json" style="display:none;">
                </div>
            </div>

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
                        <label class="form-label" style="display:block; margin-bottom:0.5rem; font-weight:500;">Course (Optional)</label>
                        <select id="select-course" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px;" disabled>
                            <option value="">-- Apply to entire college --</option>
                        </select>
                        <div class="text-muted text-sm mt-1">Leave blank to set college-wide defaults. Course-specific updates override college-wide values.</div>
                    </div>
                </div>
            </div>

            <div id="editor-form" style="display:none;">
                <div style="background:var(--bg-surface); padding:1.5rem; border-radius:8px; border:1px solid var(--border-color); margin-bottom:2rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                        <h2 style="margin:0; font-size:1.25rem;">Data Entry</h2>
                        <div id="last-updated-badge" class="badge badge-outline" style="display:none; color:var(--text-muted);"></div>
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

                    <div style="display:flex; justify-content:space-between; margin-top:2rem; padding-top:1.5rem; border-top:1px solid var(--border-color);">
                        <button id="btn-remove-current" class="btn btn-outline" style="border-radius:4px; font-weight:500; color:var(--danger); border-color:var(--danger);">Remove Current</button>
                        <button id="btn-save" class="btn btn-primary" style="border-radius:4px; font-weight:500; padding:0.5rem 2rem;">Save Updates</button>
                    </div>
                </div>
            </div>
            
            <div id="status-message" style="margin-bottom:1.5rem; font-weight:500;"></div>
        </div>
    `;

    const selectCollege = container.querySelector('#select-college');
    const selectCourse = container.querySelector('#select-course');
    const editorForm = container.querySelector('#editor-form');
    const statusMsg = container.querySelector('#status-message');

    // Populate colleges
    if (window.APP_META && window.APP_META.institutes) {
        const sortedInsts = [...window.APP_META.institutes].sort((a, b) => a.name.localeCompare(b.name));
        sortedInsts.forEach(inst => {
            const opt = document.createElement('option');
            opt.value = inst.id;
            opt.textContent = `${inst.name} (${inst.state || 'N/A'})`;
            selectCollege.appendChild(opt);
        });
    }

    // Handlers
    selectCollege.addEventListener('change', async (e) => {
        const instId = e.target.value;
        selectCourse.innerHTML = '<option value="">-- Apply to entire college --</option>';
        
        if (!instId) {
            selectCourse.disabled = true;
            editorForm.style.display = 'none';
            return;
        }

        try {
            // Fetch courses for this college using DATA_ENGINE
            const res = await window.DATA_ENGINE.search(null, { institutes: [parseInt(instId)] });
            if (res && res.data) {
                // Extract unique courses
                const courseMap = new Map();
                res.data.forEach(opt => {
                    if (!courseMap.has(opt.course.id)) {
                        courseMap.set(opt.course.id, opt.course.name);
                    }
                });
                
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

        selectCourse.disabled = false;
        loadForm(instId, selectCourse.value);
    });

    selectCourse.addEventListener('change', () => {
        if (selectCollege.value) {
            loadForm(selectCollege.value, selectCourse.value);
        }
    });

    function showStatus(msg, isError = false) {
        statusMsg.textContent = msg;
        statusMsg.style.color = isError ? 'var(--danger)' : 'var(--success)';
        setTimeout(() => { statusMsg.textContent = ''; }, 3000);
    }

    function loadForm(instId, courseId) {
        editorForm.style.display = 'block';
        const update = CollegeUpdatesStore.getUpdate(parseInt(instId), courseId ? parseInt(courseId) : null);
        
        const setVal = (id, val) => container.querySelector(id).value = val !== null && val !== undefined ? val : '';
        
        if (update) {
            setVal('#input-tuition', update.fees?.annualTuition);
            setVal('#input-total-fee', update.fees?.totalCourse);
            setVal('#input-hostel', update.fees?.hostel);
            setVal('#input-other-fee', update.fees?.otherMandatory);
            setVal('#input-stipend', update.stipend?.monthly);
            setVal('#input-duration', update.courseDurationMonths);
            setVal('#input-bond-req', update.bond?.required || 'UNKNOWN');
            setVal('#input-bond-months', update.bond?.durationMonths);
            setVal('#input-bond-penalty', update.bond?.penaltyAmount);
            setVal('#input-bond-details', update.bond?.details);
            setVal('#input-remarks', update.remarks);
            setVal('#input-source-label', update.source?.label);
            setVal('#input-source-url', update.source?.url);
            
            const dateStr = new Date(update.lastUpdatedAt).toLocaleString();
            const badge = container.querySelector('#last-updated-badge');
            badge.textContent = `Last updated: ${dateStr}`;
            badge.style.display = 'inline-block';
        } else {
            // Reset fields
            setVal('#input-tuition', '');
            setVal('#input-total-fee', '');
            setVal('#input-hostel', '');
            setVal('#input-other-fee', '');
            setVal('#input-stipend', '');
            setVal('#input-duration', '');
            setVal('#input-bond-req', 'UNKNOWN');
            setVal('#input-bond-months', '');
            setVal('#input-bond-penalty', '');
            setVal('#input-bond-details', '');
            setVal('#input-remarks', '');
            setVal('#input-source-label', '');
            setVal('#input-source-url', '');
            container.querySelector('#last-updated-badge').style.display = 'none';
        }
    }

    container.querySelector('#btn-save').addEventListener('click', () => {
        const instId = selectCollege.value;
        const courseId = selectCourse.value;
        if (!instId) return;

        const getNum = (id) => {
            const val = container.querySelector(id).value;
            return val === '' ? null : Number(val);
        };
        const getStr = (id) => {
            const val = container.querySelector(id).value.trim();
            return val === '' ? null : val;
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
                required: container.querySelector('#input-bond-req').value,
                durationMonths: getNum('#input-bond-months'),
                penaltyAmount: getNum('#input-bond-penalty'),
                details: getStr('#input-bond-details')
            },
            remarks: getStr('#input-remarks'),
            source: {
                label: getStr('#input-source-label'),
                url: getStr('#input-source-url'),
                verifiedAt: new Date().toISOString()
            }
        };

        // Basic validation
        if (updateObj.source.url && !updateObj.source.url.startsWith('http')) {
            showStatus('Source URL must start with http:// or https://', true);
            return;
        }

        if (confirm('Save these manual updates?')) {
            CollegeUpdatesStore.saveUpdate(parseInt(instId), courseId ? parseInt(courseId) : null, updateObj);
            showStatus('Updates saved successfully!');
            loadForm(instId, courseId);
        }
    });

    container.querySelector('#btn-remove-current').addEventListener('click', () => {
        const instId = selectCollege.value;
        const courseId = selectCourse.value;
        if (!instId) return;

        if (confirm(`Are you sure you want to remove the updates for this ${courseId ? 'course' : 'college'}?`)) {
            CollegeUpdatesStore.deleteUpdate(parseInt(instId), courseId ? parseInt(courseId) : null);
            showStatus('Update removed.');
            loadForm(instId, courseId);
        }
    });

    container.querySelector('#btn-clear-all').addEventListener('click', () => {
        if (confirm('DANGER: This will delete ALL local manual updates across all colleges. Are you sure?')) {
            CollegeUpdatesStore.clearAll();
            showStatus('All updates cleared.');
            if (selectCollege.value) {
                loadForm(selectCollege.value, selectCourse.value);
            }
        }
    });

    container.querySelector('#btn-export').addEventListener('click', () => {
        const dataStr = CollegeUpdatesStore.exportUpdates();
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `college-updates-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });

    let importMergeMode = true;
    const fileInput = container.querySelector('#file-import');

    container.querySelector('#btn-import-merge').addEventListener('click', () => {
        importMergeMode = true;
        fileInput.click();
    });
    container.querySelector('#btn-import-replace').addEventListener('click', () => {
        importMergeMode = false;
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                if (!importMergeMode && !confirm('WARNING: This will replace ALL existing local updates with the imported file. Continue?')) {
                    fileInput.value = '';
                    return;
                }
                
                CollegeUpdatesStore.importUpdates(event.target.result, importMergeMode);
                showStatus(`Successfully imported updates (${importMergeMode ? 'merged' : 'replaced'}).`);
                if (selectCollege.value) {
                    loadForm(selectCollege.value, selectCourse.value);
                }
            } catch (err) {
                showStatus(`Import failed: ${err.message}`, true);
            }
            fileInput.value = ''; // reset
        };
        reader.readAsText(file);
    });
}
