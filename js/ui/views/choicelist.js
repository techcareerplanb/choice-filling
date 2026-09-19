import { generateRecommendations } from '../../engine/recommendationEngine.js';

export async function renderChoiceList(container) {
    container.innerHTML = `
        <div class="container" style="max-width:1100px; margin-top:2rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;" class="no-print">
                <h1>Choice List Builder</h1>
                <div style="display:flex; gap:0.5rem;">
                    <button id="btn-print" class="btn btn-outline" style="border:1px solid var(--border-color); background:var(--bg-surface); cursor:pointer; padding:0.5rem 1rem; border-radius:4px;">Print A4</button>
                    <button id="btn-export-csv" class="btn btn-outline" style="border:1px solid var(--border-color); background:var(--bg-surface); cursor:pointer; padding:0.5rem 1rem; border-radius:4px;">Export CSV</button>
                    <button id="btn-export-json" class="btn btn-outline" style="border:1px solid var(--border-color); background:var(--bg-surface); cursor:pointer; padding:0.5rem 1rem; border-radius:4px;">Export JSON</button>
                </div>
            </div>
            
            <div style="background:var(--warning-light); color:var(--warning); padding:1rem; border-radius:8px; margin-bottom:2rem; font-size:0.875rem;" class="no-print">
                <strong>Disclaimer:</strong> This is an advisory planning tool based on your preferences and historical data. Review official MCC counselling rules and seat matrices before final submission. This tool does not automatically submit choices.
            </div>
            
            <div id="choicelist-content">
                <div class="spinner"></div>
            </div>
        </div>
        
        <style>
            @media print {
                body { background: white; }
                .no-print, header, nav, #compare-bar { display: none !important; }
                .container { max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
                .card { border: none !important; box-shadow: none !important; border-bottom: 1px solid #ccc !important; padding: 10px 0 !important; }
                h1 { margin-top: 0 !important; }
            }
        </style>
    `;

    const content = document.getElementById('choicelist-content');
    
    try {
        const stateModule = await import('../../state.js');
        const listState = stateModule.state.shortlist;
        
        if (listState.length === 0) {
            content.innerHTML = `
                <div class="card" style="background:var(--bg-surface); padding:3rem; text-align:center; border-radius:8px;">
                    <h3 class="text-muted" style="margin-bottom:1rem;">Your Choice List is empty.</h3>
                    <p class="text-muted mb-3">You haven't added any colleges to your choice list yet.</p>
                    <a href="#/results" class="btn btn-primary" style="display:inline-block; padding:0.5rem 1rem; border-radius:4px; text-decoration:none;">Go to Search</a>
                </div>
            `;
            return;
        }

        const engine = window.DATA_ENGINE;
        const results = await Promise.allSettled(listState.map(item => engine.getOption(item.id)));
        
        const mergedData = [];
        listState.forEach((item, index) => {
            const result = results[index];
            if (result.status === 'fulfilled' && result.value) {
                mergedData.push({
                    state: item,
                    data: result.value
                });
            } else {
                console.warn(`Skipping missing/removed option ID ${item.id}`);
            }
        });
        
        if (mergedData.length === 0) {
            content.innerHTML = `<div class="card p-4 text-center text-muted">All selected choices are no longer available in the database.</div>`;
            return;
        }
        
        // Calculate Summary Stats
        let dreamCount = 0, targetCount = 0, safeCount = 0;
        let minFee = Infinity, maxFee = 0;
        let totalMargin = 0, marginCount = 0;
        
        mergedData.forEach(item => {
            if (item.state.tag === 'Dream') dreamCount++;
            else if (item.state.tag === 'Target') targetCount++;
            else if (item.state.tag === 'Safe') safeCount++;
            
            if (item.data.financials && item.data.financials.feeRaw) {
                const f = parseInt(item.data.financials.feeRaw.replace(/[^0-9]/g, ''), 10);
                if (!isNaN(f)) {
                    if (f < minFee) minFee = f;
                    if (f > maxFee) maxFee = f;
                }
            }
            
            if (item.data._fit && typeof item.data._fit.rankMarginLatest === 'number') {
                totalMargin += item.data._fit.rankMarginLatest;
                marginCount++;
            }
        });
        
        const avgMargin = marginCount > 0 ? Math.round(totalMargin / marginCount) : 0;
        
        // Generate Recommendations invisibly to hold metadata
        const recommendedMetadata = generateRecommendations(mergedData, {});

        // Build HTML
        const renderList = (dataToRender) => {
            return `
                <div class="card no-print" style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:8px; padding:1.5rem; margin-bottom:2rem; display:flex; flex-wrap:wrap; gap:2rem;">
                    <div><div class="text-muted text-sm mb-1">Total Options</div><div style="font-size:1.5rem; font-weight:600;">${dataToRender.length}</div></div>
                    <div><div class="text-muted text-sm mb-1">Dream / Target / Safe</div><div style="font-size:1.25rem; font-weight:600;"><span style="color:var(--primary-color)">${dreamCount}</span> / <span style="color:var(--warning)">${targetCount}</span> / <span style="color:var(--success)">${safeCount}</span></div></div>
                    <div><div class="text-muted text-sm mb-1">Fee Range</div><div style="font-size:1.25rem; font-weight:600;">${minFee !== Infinity ? '₹' + minFee.toLocaleString() : 'N/A'} – ${maxFee > 0 ? '₹' + maxFee.toLocaleString() : 'N/A'}</div></div>
                    <div><div class="text-muted text-sm mb-1">Avg Margin</div><div style="font-size:1.25rem; font-weight:600; color:${avgMargin >= 0 ? 'var(--success)' : 'var(--danger)'}">${avgMargin > 0 ? '+' : ''}${avgMargin.toLocaleString()}</div></div>
                </div>
                
                <div class="no-print" style="margin-bottom:1.5rem; display:flex; justify-content:flex-end;">
                    <button id="btn-auto-sort" class="btn btn-primary" style="padding:0.75rem 1.5rem; border-radius:4px; font-weight:600; cursor:pointer;">✨ Apply Recommended Order</button>
                </div>
                
                <div id="choice-sortable-list" style="display:flex; flex-direction:column; gap:1rem;">
                    ${dataToRender.map((obj, index) => {
                        const opt = obj.data;
                        const s = obj.state;
                        
                        const meta = recommendedMetadata.find(m => m.optionId === opt.id);
                        
                        let badgeClass = 'var(--bg-main)';
                        let badgeText = 'var(--text-muted)';
                        if (meta.tier === 'Dream') { badgeClass = 'var(--primary-light)'; badgeText = 'var(--primary-color)'; }
                        else if (meta.tier === 'Target') { badgeClass = 'var(--warning-light)'; badgeText = 'var(--warning)'; }
                        else if (meta.tier === 'Safe') { badgeClass = 'var(--success-light)'; badgeText = 'var(--success)'; }

                        return `
                            <div class="shortlist-item card" data-id="${opt.id}" style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:8px; display:flex; align-items:stretch; overflow:hidden;">
                                <div style="width:60px; background:var(--bg-main); display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:1.5rem; color:var(--text-muted); border-right:1px solid var(--border-color);">
                                    ${index + 1}
                                </div>
                                
                                <div style="flex:1; padding:1.5rem;">
                                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                                        <div>
                                            <h3 style="margin:0 0 0.25rem 0; font-size:1.25rem;">${opt.institute.name}</h3>
                                            <div style="font-weight:500; color:var(--text); margin-bottom:0.5rem;">${opt.course.name}</div>
                                            <div style="font-size:0.875rem; color:var(--text-muted); margin-bottom:1rem;">
                                                ${opt.institute.state}${opt.institute.type ? ` &middot; ${opt.institute.type}` : ''}
                                            </div>
                                        </div>
                                        <div style="text-align:right;">
                                            <span style="display:inline-block; padding:0.25rem 0.5rem; border-radius:4px; font-size:0.75rem; font-weight:600; background: ${badgeClass}; color: ${badgeText};">${meta.tier.toUpperCase()}</span>
                                            <div class="text-muted text-sm mt-1">${s.isFavorite ? '★ Favorite' : ''}</div>
                                            
                                            <div class="no-print mt-3" style="display:flex; align-items:center; gap:0.5rem; justify-content:flex-end;">
                                                <label style="font-size:0.875rem; color:var(--text-muted);">Move to:</label>
                                                <input type="number" class="form-control pos-input" min="1" max="${dataToRender.length}" value="${index + 1}" style="width:70px; padding:0.25rem; text-align:center;">
                                                <button class="btn btn-outline btn-move" data-id="${opt.id}" data-current="${index}" style="padding:0.25rem 0.5rem; font-size:0.875rem;">Move</button>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div style="background:var(--bg-surface-hover); padding:1rem; border-radius:4px; border-left:3px solid ${badgeText}; font-size:0.875rem; color:var(--text);">
                                        <strong>Recommendation Reason:</strong> ${meta.reasons.join(' &middot; ')}
                                    </div>
                                    
                                    ${s.notes ? `<div style="margin-top:1rem; font-size:0.875rem; color:var(--text-muted);"><em>Notes: ${s.notes}</em></div>` : ''}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        };
        
        content.innerHTML = renderList(mergedData);
        
        // Export logic
        document.getElementById('btn-print').addEventListener('click', () => window.print());
        
        document.getElementById('btn-export-json').addEventListener('click', () => {
            const blob = new Blob([JSON.stringify(mergedData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `neet_pg_choices_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        });
        
        document.getElementById('btn-export-csv').addEventListener('click', () => {
            let csv = 'Order,Tier,Institute,State,Course,Fee,Stipend,Notes\n';
            mergedData.forEach((obj, idx) => {
                const m = recommendedMetadata.find(x => x.optionId === obj.data.id);
                const row = [
                    idx + 1,
                    m ? m.tier : obj.state.tag,
                    `"${obj.data.institute.name}"`,
                    obj.data.institute.state,
                    `"${obj.data.course.name}"`,
                    `"${obj.data.financials.feeRaw || ''}"`,
                    `"${obj.data.financials.stipendRaw || ''}"`,
                    `"${obj.state.notes.replace(/"/g, '""')}"`
                ];
                csv += row.join(',') + '\n';
            });
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `neet_pg_choices_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        });
        
        // Auto-Sort Logic
        document.getElementById('btn-auto-sort').addEventListener('click', () => {
            // Apply recommended order
            const orderedIds = recommendedMetadata.map(m => m.optionId);
            stateModule.reorderShortlist(orderedIds);
            
            // Re-render
            const newlySortedData = orderedIds.map(id => mergedData.find(m => m.state.id === id));
            content.innerHTML = renderList(newlySortedData);
            bindMoveControls(newlySortedData.length); // Rebind since DOM changed
        });

        const bindMoveControls = (totalLength) => {
            const listEl = document.getElementById('choice-sortable-list');
            if (!listEl) return;
            
            listEl.addEventListener('click', (e) => {
                if (e.target.classList.contains('btn-move')) {
                    const btn = e.target;
                    const id = parseInt(btn.dataset.id, 10);
                    const currentIdx = parseInt(btn.dataset.current, 10);
                    
                    const inputEl = btn.previousElementSibling;
                    const rawVal = parseInt(inputEl.value, 10);
                    
                    if (isNaN(rawVal)) {
                        alert("Please enter a valid numeric position.");
                        return;
                    }
                    
                    let newIdx = rawVal - 1;
                    if (newIdx < 0) newIdx = 0;
                    if (newIdx >= totalLength) newIdx = totalLength - 1;
                    
                    if (newIdx === currentIdx) return; // No change
                    
                    // Reorder IDs array directly
                    const currentOrderIds = Array.from(listEl.querySelectorAll('.shortlist-item')).map(el => parseInt(el.dataset.id, 10));
                    const itemToMove = currentOrderIds.splice(currentIdx, 1)[0];
                    currentOrderIds.splice(newIdx, 0, itemToMove);
                    
                    stateModule.reorderShortlist(currentOrderIds);
                    renderChoiceList(container); // Re-render to update index numbers
                }
            });
        };
        
        bindMoveControls(mergedData.length);

    } catch (e) {
        content.innerHTML = `<div class="card p-4 text-danger">Failed to load Choice List: ${e.message}</div>`;
    }
}
