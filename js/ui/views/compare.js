export async function renderCompare(container, params = {}) {
    container.innerHTML = `
        <div class="container" style="max-width:1400px; margin-top:2rem;">
            <a href="javascript:history.back()" class="text-primary text-sm mb-4" style="display:inline-block; font-weight:500;">&larr; Back to Results</a>
            <h1 class="mb-4">Compare Options</h1>
            <div id="compare-content">
                <div class="spinner"></div>
            </div>
        </div>
    `;

    const content = document.getElementById('compare-content');
    
    try {
        const stateModule = await import('../../state.js');
        const compareIds = stateModule.state.compare;
        
        if (compareIds.length === 0) {
            content.innerHTML = `
                <div class="card" style="background:var(--bg-surface); padding:3rem; text-align:center; border-radius:8px;">
                    <h3 class="text-muted" style="margin-bottom:1rem;">No options selected for comparison</h3>
                    <p class="text-muted mb-4">Go back to the search results to add colleges to your compare list.</p>
                    <a href="#/results" class="btn btn-primary" style="display:inline-block; padding:0.5rem 1.5rem; border-radius:4px; text-decoration:none;">Go to Search</a>
                </div>
            `;
            return;
        }

        const engine = window.DATA_ENGINE;
        
        // Fetch all options in a single batch request
        const options = await engine.getOptionsBatch(compareIds);
        
        // Find best fit column
        let bestIndex = -1;
        let bestMargin = -Infinity;
        options.forEach((opt, idx) => {
            if (opt._fit && opt._fit.rankMarginLatest !== null && opt._fit.rankMarginLatest > bestMargin) {
                bestMargin = opt._fit.rankMarginLatest;
                bestIndex = idx;
            }
        });

        // Helper to generate a cell
        const renderCell = (idx, contentHtml, isBest = false) => {
            const bg = (isBest && idx === bestIndex) ? 'background:var(--success-light);' : '';
            return `<td style="padding:1rem; border-bottom:1px solid var(--border-color); vertical-align:top; min-width:250px; ${bg}">${contentHtml}</td>`;
        };

        const html = `
            <div style="overflow-x:auto; background:var(--bg-surface); border-radius:8px; box-shadow:var(--shadow-md); margin-bottom:4rem;">
                <table style="width:100%; border-collapse:collapse; text-align:left;">
                    
                    <!-- Actions Row -->
                    <tr>
                        <th style="padding:1rem; border-bottom:1px solid var(--border-color); position:sticky; left:0; background:var(--bg-surface); z-index:2; min-width:150px; border-right:1px solid var(--border-color);"></th>
                        ${options.map((opt, i) => `
                            <th style="padding:1rem; border-bottom:1px solid var(--border-color); vertical-align:top; min-width:250px; background:var(--bg-surface);">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                                    <span style="font-weight:600; color:var(--text-muted); font-size:0.875rem;">Option ${i + 1}</span>
                                    <button class="remove-btn" data-id="${opt.id}" style="background:transparent; border:none; color:var(--danger); cursor:pointer; font-size:1.25rem; line-height:1;">&times;</button>
                                </div>
                                <h3 style="font-size:1.125rem; margin-bottom:0.25rem;">${opt.institute.name}</h3>
                                <p class="text-muted text-sm mb-4">${opt.course.name}</p>
                                <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                                    <a href="#/college/${opt.id}" class="btn btn-primary" style="padding:0.4rem 0.75rem; font-size:0.75rem; border-radius:4px; text-decoration:none;">View Details</a>
                                    <button class="btn btn-outline shortlist-btn" data-id="${opt.id}" style="padding:0.4rem 0.75rem; font-size:0.75rem; border-radius:4px; cursor:pointer; border:1px solid var(--border-color); background:transparent;">${stateModule.state.shortlist.some(x => x.id === opt.id) ? '✓ Shortlisted' : '+ Shortlist'}</button>
                                </div>
                            </th>
                        `).join('')}
                    </tr>

                    <!-- Basic Info -->
                    <tr>
                        <td style="padding:1rem; font-weight:600; border-bottom:1px solid var(--border-color); position:sticky; left:0; background:var(--bg-main); border-right:1px solid var(--border-color);">State</td>
                        ${options.map((opt, i) => renderCell(i, opt.institute.state)).join('')}
                    </tr>
                    <tr>
                        <td style="padding:1rem; font-weight:600; border-bottom:1px solid var(--border-color); position:sticky; left:0; background:var(--bg-main); border-right:1px solid var(--border-color);">Quota</td>
                        ${options.map((opt, i) => renderCell(i, opt.quota.name)).join('')}
                    </tr>
                    <tr>
                        <td style="padding:1rem; font-weight:600; border-bottom:1px solid var(--border-color); position:sticky; left:0; background:var(--bg-main); border-right:1px solid var(--border-color);">Category</td>
                        ${options.map((opt, i) => renderCell(i, opt.category.name)).join('')}
                    </tr>

                    <!-- Fit -->
                    <tr>
                        <td style="padding:1rem; font-weight:600; border-bottom:1px solid var(--border-color); position:sticky; left:0; background:var(--bg-main); border-right:1px solid var(--border-color);">Historical Fit</td>
                        ${options.map((opt, i) => {
                            let badgeClass = 'var(--warning-light)';
                            let badgeText = 'var(--warning)';
                            if (opt._fit.classification === 'Historically favorable') { badgeClass = 'var(--success-light)'; badgeText = 'var(--success)'; }
                            else if (opt._fit.classification === 'Historically difficult') { badgeClass = 'var(--danger-light)'; badgeText = 'var(--danger)'; }
                            return renderCell(i, `
                                <span style="display:inline-block; padding:0.25rem 0.5rem; border-radius:4px; font-size:0.75rem; font-weight:600; background: ${badgeClass}; color: ${badgeText}; margin-bottom:0.5rem;">${opt._fit.classification}</span>
                                <div style="font-size:0.875rem; color:var(--text-muted);">Confidence: <strong>${opt._fit.confidence}</strong></div>
                            `, true); // highlight best fit
                        }).join('')}
                    </tr>

                    <!-- Cutoffs -->
                    <tr>
                        <td style="padding:1rem; font-weight:600; border-bottom:1px solid var(--border-color); position:sticky; left:0; background:var(--bg-main); border-right:1px solid var(--border-color);">Latest Cutoff</td>
                        ${options.map((opt, i) => {
                            const analyzed = opt._analyzedCutoffs;
                            const val = analyzed && analyzed.latestYear && analyzed.latestRound && analyzed.latestClosingRank != null ? 
                                `${analyzed.latestYear} R${analyzed.latestRound}: <strong>${analyzed.latestClosingRank.toLocaleString()}</strong>` : '—';
                            return renderCell(i, val);
                        }).join('')}
                    </tr>

                    <!-- Financials -->
                    <tr>
                        <td style="padding:1rem; font-weight:600; border-bottom:1px solid var(--border-color); position:sticky; left:0; background:var(--bg-main); border-right:1px solid var(--border-color);">Annual Fee</td>
                        ${options.map((opt, i) => renderCell(i, `${opt.financials.feeRaw || 'Not available'} ${opt.financials.feeHasCaveat ? '<span title="Subject to conditions" style="color:var(--warning)">⚠️</span>' : ''}`)).join('')}
                    </tr>
                    <tr>
                        <td style="padding:1rem; font-weight:600; border-bottom:1px solid var(--border-color); position:sticky; left:0; background:var(--bg-main); border-right:1px solid var(--border-color);">Stipend (Year 1)</td>
                        ${options.map((opt, i) => renderCell(i, `${opt.financials.stipendRaw || 'Not available'} ${opt.financials.stipendHasCaveat ? '<span title="Subject to change" style="color:var(--warning)">⚠️</span>' : ''}`)).join('')}
                    </tr>
                    <tr>
                        <td style="padding:1rem; font-weight:600; border-bottom:1px solid var(--border-color); position:sticky; left:0; background:var(--bg-main); border-right:1px solid var(--border-color);">Service Bond</td>
                        ${options.map((opt, i) => renderCell(i, `${opt.financials.bondYears ? `${opt.financials.bondYears} Year(s)` : (opt.financials.bondYears === 0 ? 'No Bond' : 'Not available')}<br><span class="text-muted text-sm">Penalty: ${opt.financials.bondPenalty ? '₹' + opt.financials.bondPenalty.toLocaleString() : 'N/A'}</span>`)).join('')}
                    </tr>

                </table>
                <div style="padding:1rem; font-size:0.75rem; color:var(--text-muted); background:var(--bg-main); border-top:1px solid var(--border-color);">
                    * Green highlighting indicates the mathematically best rank margin amongst the compared options. This does not guarantee admission. ⚠️ indicates the value is subject to caveats/court orders.
                </div>
            </div>
        `;
        
        content.innerHTML = html;
        
        // Bind actions
        content.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-btn')) {
                const id = parseInt(e.target.dataset.id, 10);
                stateModule.toggleCompare(id);
                // Re-render
                renderCompare(container, params);
            }
            if (e.target.classList.contains('shortlist-btn')) {
                const id = parseInt(e.target.dataset.id, 10);
                stateModule.toggleShortlist(id);
                e.target.textContent = stateModule.state.shortlist.some(x => x.id === id) ? '✓ Shortlisted' : '+ Shortlist';
            }
        });

    } catch (e) {
        content.innerHTML = `<div class="card p-4 text-danger">Failed to load comparison: ${e.message}</div>`;
    }
}
