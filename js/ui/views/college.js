import { getRankLabel, getRankShortLabel } from '../utils.js';
import { renderSVGChart } from '../components/chart.js';
import { navigate } from '../../router.js';

export async function renderCollege(container, optionId, params = {}) {
    const engine = window.DATA_ENGINE;
    
    // Parse rank from params
    const userRank = params.rank ? parseInt(params.rank, 10) : null;
    
    container.innerHTML = `
        <div class="container" style="max-width:1000px; margin-top:2rem;">
            <a href="javascript:history.back()" class="text-primary text-sm mb-4" style="display:inline-block; font-weight:500;">&larr; Back to Results</a>
            <div id="college-detail-content">
                <div class="spinner"></div>
            </div>
        </div>
    `;
    
    const content = document.getElementById('college-detail-content');
    
    try {
        const opt = await engine.getOption(optionId, userRank, params.year, params.round, params.includeInservice);
        
        let cutoffsHtml = `<p class="text-muted">No historical cutoff data available for this specific opportunity.</p>`;
        let chartHtml = '';
        
        // 1. Monogram Generator
        const getInitials = (name) => {
            const words = name.replace(/[^a-zA-Z ]/g, "").split(' ').filter(w => w.length > 0);
            if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
            if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
            return 'UN';
        };
        const monogram = getInitials(opt.institute.name);
        
        // 2. Course Selector
        let courseSelectorHtml = '';
        if (opt._siblings && opt._siblings.length > 0) {
            courseSelectorHtml = `
                <div style="margin-bottom:1.5rem;">
                    <label class="text-muted text-sm" style="display:block; margin-bottom:0.5rem; font-weight:500;">View other courses under this quota/category:</label>
                    <select id="course-selector" class="form-control" style="width:100%; max-width:400px; padding:0.75rem; border-radius:4px; border:1px solid var(--border-color); font-size:1rem;">
                        ${opt._siblings.map(s => `<option value="${s.optionId}" ${s.optionId === opt.id ? 'selected' : ''}>${s.courseName}</option>`).join('')}
                    </select>
                </div>
            `;
        }

        if (opt.cutoffs && opt.cutoffs.length > 0) {
            chartHtml = renderSVGChart(opt.cutoffs, userRank);
            
            // Matrix Table
            const years = [...new Set(opt.cutoffs.map(c => c.year))].sort((a,b) => b-a);
            const rounds = [...new Set(opt.cutoffs.map(c => c.round))].sort((a,b) => a-b);
            
            const matrix = {};
            opt.cutoffs.forEach(c => {
                if (!matrix[c.year]) matrix[c.year] = {};
                matrix[c.year][c.round] = c.closingRank;
            });
            
            cutoffsHtml = `
                <div style="overflow-x:auto;">
                    <table class="table" style="width:100%; border-collapse:collapse; margin-top:1rem; text-align:center;">
                        <thead>
                            <tr style="border-bottom:2px solid var(--border-color); background:var(--bg-surface-hover);">
                                <th style="padding:0.75rem; text-align:left;">Year</th>
                                ${rounds.map(r => `<th style="padding:0.75rem;">Round ${r}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${years.map(y => `
                                <tr style="border-bottom:1px solid var(--border-color);">
                                    <td style="padding:0.75rem; text-align:left; font-weight:600;">${y}</td>
                                    ${rounds.map(r => {
                                        const val = matrix[y][r];
                                        return `<td style="padding:0.75rem;">${val ? val.toLocaleString() : '—'}</td>`;
                                    }).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        let fitClass = 'var(--bg-main)';
        let fitColor = 'var(--text-muted)';
        if (opt._fit.classification === 'Historically favorable') { fitClass = 'var(--success-light)'; fitColor = 'var(--success)'; }
        else if (opt._fit.classification === 'Historically competitive') { fitClass = 'var(--warning-light)'; fitColor = 'var(--warning)'; }
        else if (opt._fit.classification === 'Historically difficult') { fitClass = 'var(--danger-light)'; fitColor = 'var(--danger)'; }
        
        const explanationHtml = userRank ? `
            <div style="background:var(--bg-surface-hover); border-radius:8px; padding:1.5rem; margin-bottom:2rem; border-left: 4px solid ${fitColor};">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.75rem;">
                    <h3 style="margin:0; display:flex; align-items:center; gap:0.5rem; font-size:1.125rem;">
                        Fit Analysis: <span style="background:${fitClass}; color:${fitColor}; padding:0.25rem 0.5rem; border-radius:4px; font-size:0.875rem;">${opt._fit.classification}</span>
                    </h3>
                    <span style="font-size:0.875rem; color:var(--text-muted);">Data Confidence: <strong>${opt._fit.confidence || 'Insufficient'}</strong></span>
                </div>
                
                <details style="margin-top:1rem;">
                    <summary style="cursor:pointer; font-weight:500; color:var(--primary-color); outline:none;">How this assessment works</summary>
                    <div style="margin-top:0.75rem; font-size:0.875rem; color:var(--text); line-height:1.6; padding:1rem; background:white; border-radius:4px; border:1px solid var(--border-color);">
                        ${opt._fit.explanation}
                        <br><br>
                        <em>Disclaimer: Historical data does not guarantee future admission. A mathematically favorable rank margin simply indicates that in previous years, candidates with worse ranks than you secured this seat. You should always list your choices strictly in the order of your true preference.</em>
                    </div>
                </details>
            </div>
        ` : `
            <div class="text-center p-4 mb-4" style="background:var(--bg-surface-hover); border-radius:8px;">
                <p class="text-muted">Enter your ${getRankLabel()} in the search page to see your personalized fit analysis.</p>
            </div>
        `;
        
        const feeVal = opt.financials.feeRaw || 'Not available';
        const stipendVal = opt.financials.stipendRaw || 'Not available';
        const bondVal = opt.financials.bondYears ? `${opt.financials.bondYears} Year(s)` : (opt.financials.bondYears === 0 ? 'No Bond' : 'Not available');
        const bondPen = opt.financials.bondPenalty ? `₹${opt.financials.bondPenalty.toLocaleString()}` : (opt.financials.bondYears === 0 ? 'N/A' : 'Not available');

        content.innerHTML = `
            <div style="position:sticky; top:73px; z-index:90; background:var(--bg-main); padding:1rem 0; border-bottom:1px solid var(--border-color); margin-bottom:2rem;" class="no-print">
                <div style="display:flex; gap:1.5rem; overflow-x:auto; white-space:nowrap; padding-bottom:0.5rem;" class="hide-scrollbar">
                    <a href="#overview" class="btn-ghost" style="font-weight:600; text-decoration:none; padding:0.5rem 1rem; border-radius:16px;">Overview</a>
                    <a href="#cutoffs" class="btn-ghost" style="font-weight:600; text-decoration:none; padding:0.5rem 1rem; border-radius:16px;">Cutoffs</a>
                    <a href="#financials" class="btn-ghost" style="font-weight:600; text-decoration:none; padding:0.5rem 1rem; border-radius:16px;">Financials</a>
                    <a href="#data" class="btn-ghost" style="font-weight:600; text-decoration:none; padding:0.5rem 1rem; border-radius:16px;">Official Data</a>
                </div>
            </div>
            
            <div class="card" style="background:var(--bg-surface); border-radius:12px; padding:2rem; box-shadow:var(--shadow-md); margin-bottom:2rem; position:relative;">
                
                <div id="overview" style="position:absolute; top:-100px;"></div>
                <div style="display:flex; align-items:flex-start; gap:1.5rem; margin-bottom:2rem;">
                    <div style="width:80px; height:80px; border-radius:12px; background:var(--primary-color); color:white; display:flex; align-items:center; justify-content:center; font-size:2rem; font-weight:bold; flex-shrink:0;">
                        ${monogram}
                    </div>
                    <div>
                        <h1 style="font-size:1.75rem; margin-bottom:0.25rem;">${opt.institute.name}</h1>
                        <h2 style="font-size:1rem; color:var(--text-muted); font-weight:500; margin-bottom:0;">${opt.institute.state} ${opt.institute.district ? `&middot; ${opt.institute.district}` : ''}</h2>
                    </div>
                </div>
                
                ${courseSelectorHtml}
                
                <div style="display:flex; gap:1rem; flex-wrap:wrap; margin-bottom:2rem;">
                    <span style="background:var(--bg-main); padding:0.5rem 1rem; border-radius:8px; font-weight:500; border:1px solid var(--border-color); font-size:0.875rem;">Quota: ${opt.quota.name}</span>
                    <span style="background:var(--bg-main); padding:0.5rem 1rem; border-radius:8px; font-weight:500; border:1px solid var(--border-color); font-size:0.875rem;">Category: ${opt.category.name}</span>
                </div>
                
                ${explanationHtml}
                
                <div id="cutoffs" style="position:absolute; top:-100px;"></div>
                <h3 style="margin-bottom:1rem; padding-bottom:0.5rem; border-bottom:1px solid var(--border-color);">Historical Trend</h3>
                <div style="margin-bottom:2rem;">
                    ${chartHtml}
                </div>
                
                <div id="financials" style="position:absolute; top:-100px;"></div>
                <h3 style="margin-top:3rem; margin-bottom:1rem; border-bottom:1px solid var(--border-color); padding-bottom:0.5rem;">College Financials, Stipend & Bond Information</h3>
                <div class="grid grid-3" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:1.5rem; padding:1.5rem; background:var(--bg-main); border-radius:8px; margin-bottom:1rem; border:1px solid var(--border-color);">
                    <div>
                        <div class="text-muted mb-2 text-sm">Annual Fee</div>
                        <div style="font-size:1.25rem; font-weight:600;">${feeVal} ${opt.financials.feeHasCaveat ? `<span title="Subject to conditions" style="color:var(--warning)">⚠️</span>` : ''}</div>
                        ${opt.financials.feeTotal ? `<div class="text-sm mt-1 text-muted">Total: ₹${opt.financials.feeTotal.toLocaleString()}</div>` : ''}
                        ${opt.financials.feeHostel ? `<div class="text-sm mt-1 text-muted">Hostel: ₹${opt.financials.feeHostel.toLocaleString()}</div>` : ''}
                        ${opt.financials.feeOther ? `<div class="text-sm mt-1 text-muted">Other: ₹${opt.financials.feeOther.toLocaleString()}</div>` : ''}
                    </div>
                    <div>
                        <div class="text-muted mb-2 text-sm">Stipend (Year 1)</div>
                        <div style="font-size:1.25rem; font-weight:600;">${stipendVal} ${opt.financials.stipendHasCaveat ? `<span title="Subject to change" style="color:var(--warning)">⚠️</span>` : ''}</div>
                        ${opt.financials.courseDurationMonths ? `<div class="text-sm mt-2 text-muted">Course Duration: ${opt.financials.courseDurationMonths} Months</div>` : ''}
                    </div>
                    <div>
                        <div class="text-muted mb-2 text-sm">Service Bond</div>
                        <div style="font-size:1.25rem; font-weight:600;">${opt.financials.bondRequired === 'YES' ? 'Yes' : opt.financials.bondRequired === 'NO' ? 'No' : bondVal}</div>
                        ${opt.financials.bondYears ? `<div class="text-sm mt-1 text-muted">Duration: ${opt.financials.bondYears} Year(s)</div>` : ''}
                        <div class="text-sm mt-1 text-muted">Penalty: ${bondPen}</div>
                        ${opt.financials.bondDetails ? `<div class="text-sm mt-2 text-muted" style="line-height:1.4;">Details: ${opt.financials.bondDetails}</div>` : ''}
                    </div>
                </div>
                ${opt.financials.remarks || opt.financials.sourceLabel ? `
                    <div style="padding:1rem; background:var(--bg-surface-hover); border-radius:8px; border:1px solid var(--border-color); font-size:0.875rem; color:var(--text-muted); margin-bottom:2rem;">
                        ${opt.financials.remarks ? `<div style="margin-bottom:0.5rem;"><strong>Remarks:</strong> ${opt.financials.remarks}</div>` : ''}
                        ${opt.financials.sourceLabel ? `<div><strong>Source:</strong> ${opt.financials.sourceUrl ? `<a href="${opt.financials.sourceUrl}" target="_blank" class="text-primary">${opt.financials.sourceLabel}</a>` : opt.financials.sourceLabel}</div>` : ''}
                    </div>
                ` : ''}
                
                <div id="data" style="position:absolute; top:-100px;"></div>
                <h3 style="margin-top:3rem; margin-bottom:1rem; border-bottom:1px solid var(--border-color); padding-bottom:0.5rem;">Official Data Integrations</h3>
                <div style="display:flex; flex-direction:column; gap:1rem; margin-bottom:2rem;">
                    
                    <div style="background:var(--bg-surface-hover); border-radius:8px; padding:1.5rem; border:1px solid var(--border-color);">
                        <h4 style="margin:0 0 0.5rem 0; font-size:1rem; display:flex; align-items:center; gap:0.5rem;">
                            <span style="font-size:1.25rem;">🪑</span> Official Seat Matrix (2025)
                        </h4>
                        ${opt.seatData && opt.seatData.status === 'AVAILABLE' ? `
                            <div style="font-size:1.125rem; font-weight:600; color:var(--text);">${opt.seatData.totalSeats} Total Seats</div>
                            ${opt.seatData.sourceType !== 'DEEMED' ? `<div style="font-size:0.875rem; color:var(--text-muted); margin-top:0.25rem;">For your category (${opt.category.name}): <strong>${opt.seatData.categorySeats} Seat(s)</strong></div>` : ''}
                            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.5rem;">Source: ${opt.seatData.source} (${opt.seatData.sourceType.replace('_', ' ')}) (Inst. Code: ${opt.seatData.instituteCode})</div>
                        ` : `
                            <div style="font-size:0.875rem; color:var(--text-muted);"><em>${opt.seatData?.notes || 'Seat count unavailable.'}</em></div>
                        `}
                    </div>

                    <div style="background:var(--bg-surface-hover); border-radius:8px; padding:1.5rem; border:1px solid var(--border-color);">
                        <h4 style="margin:0 0 0.5rem 0; font-size:1rem; display:flex; align-items:center; gap:0.5rem;">
                            <span style="font-size:1.25rem;">🏠</span> Domicile Eligibility
                        </h4>
                        ${opt.eligibilityData && opt.eligibilityData.status === 'AVAILABLE' ? `
                            <div style="font-size:1.125rem; font-weight:600; color:${opt.eligibilityData.eligible ? 'var(--success)' : 'var(--danger)'};">
                                ${opt.eligibilityData.eligible ? 'Eligible' : 'Not Eligible'}
                            </div>
                            <div style="font-size:0.875rem; color:var(--text-muted); margin-top:0.25rem;">${opt.eligibilityData.notes}</div>
                        ` : `
                            <div style="font-size:0.875rem; color:var(--text-muted);"><em>Domicile eligibility could not be verified. Domicile rules require official datasets to process specific institutional quotas and minority status.</em></div>
                        `}
                    </div>
                </div>

                <details style="margin-bottom:3rem;">
                    <summary style="cursor:pointer; font-weight:500; color:var(--text-muted); outline:none; font-size:0.875rem;">Data Sources & Caveats</summary>
                    <div style="margin-top:0.75rem; font-size:0.875rem; color:var(--text); line-height:1.6; padding:1rem; background:var(--bg-surface-hover); border-radius:4px; border:1px solid var(--border-color);">
                        <ul style="margin:0; padding-left:1.5rem;">
                            <li>Financial values containing a ⚠️ marker indicate the original source data contained an asterisk (*), meaning the value is subject to conditions or court orders.</li>
                            <li>"Not available" indicates the value was entirely missing from the official dataset, rather than being zero.</li>
                            <li><strong>Zero Inference Policy:</strong> Seat counts and eligibility are deliberately omitted and stubbed to UNAVAILABLE until official data is passed into the provider architecture. We do not infer PG seats from hospital bed counts or historical allotment volumes.</li>
                        </ul>
                    </div>
                </details>
                
                <h3 style="margin-bottom:1rem; border-bottom:1px solid var(--border-color); padding-bottom:0.5rem;">Raw Cutoff Matrix (${getRankLabel()})</h3>
                ${cutoffsHtml}
            </div>
            
            <div style="display:flex; justify-content:center; gap:1rem; margin-bottom:4rem;" class="no-print">
                <button class="btn btn-primary btn-shortlist" data-id="${opt.id}" style="padding:1rem 2.5rem; font-size:1.125rem; border-radius:8px; font-weight:600; cursor:pointer; background:var(--primary-color); color:white; border:none; box-shadow:0 4px 6px rgba(37,99,235,0.2);">+ Shortlist</button>
            </div>
            
            <style>
                html { scroll-behavior: smooth; }
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            </style>
        `;
        
        // Bind Course Selector routing
        const selector = content.querySelector('#course-selector');
        if (selector) {
            selector.addEventListener('change', (e) => {
                const newOptionId = e.target.value;
                if (newOptionId) {
                    navigate(`/college/${newOptionId}`, { rank: userRank || '', year: params.year || '', round: params.round || '' });
                }
            });
        }
        
        // Bind Shortlist Button
        import('../../state.js').then(module => {
            const btn = content.querySelector('.btn-shortlist');
            if (module.state.shortlist.some(i => i.id === opt.id)) {
                btn.textContent = '✓ Shortlisted';
                btn.classList.replace('btn-primary', 'btn-outline');
            }
            btn.addEventListener('click', (e) => {
                module.toggleShortlist(opt.id);
                if (module.state.shortlist.some(i => i.id === opt.id)) {
                    btn.textContent = '✓ Shortlisted';
                    btn.classList.replace('btn-primary', 'btn-outline');
                } else {
                    btn.textContent = '+ Shortlist';
                    btn.classList.replace('btn-outline', 'btn-primary');
                }
            });
        });
        
    } catch (e) {
        content.innerHTML = `<div class="card" style="padding:2rem;"><div class="text-danger">Failed to load college details: ${e.message}</div></div>`;
    }
}
