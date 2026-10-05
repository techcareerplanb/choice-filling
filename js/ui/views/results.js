import { getRankLabel, getRankShortLabel } from '../utils.js';
import { navigate } from '../../router.js';
import { getCacheItem, setCacheItem } from '../../engine/cache.js';

let isFirstLoad = true;

export async function renderResults(container, params = {}) {
    const engine = window.DATA_ENGINE;
    
    // Restore filters from cache if the URL has no params and it's the first load
    if (isFirstLoad && Object.keys(params).length === 0) {
        isFirstLoad = false;
        try {
            const cachedParams = await getCacheItem('uiState', 'lastSearchParams');
            if (cachedParams && Object.keys(cachedParams).length > 0) {
                // We have cached filters, redirect to use them
                navigate('/results', cachedParams);
                return;
            }
        } catch (err) {
            console.error('Failed to read cached filters', err);
        }
    }
    isFirstLoad = false;
    
    // Save current filters to cache
    setCacheItem('uiState', 'lastSearchParams', params).catch(console.error);

    // Parse rank for fit assessment
    const rank = params.rank ? parseInt(params.rank, 10) : null;
    const aiRank = params.aiRank ? parseInt(params.aiRank, 10) : null;
    
    // Build search criteria from params
    const criteria = {};
    if (params.bond) criteria.bond = params.bond;
    if (params.budget) criteria.budget = parseInt(params.budget, 10);
    if (params.seats) criteria.seats = parseInt(params.seats, 10);
    if (params.stipend) criteria.stipend = parseInt(params.stipend, 10);
    if (params.specialisation) {
        criteria.courses = params.specialisation.split(',').map(s => s.trim()).filter(s => s.length > 0);
    }
    if (params.state) {
        criteria.states = params.state.split(',').map(s => s.trim()).filter(s => s.length > 0);
    }
    if (params.institute) {
        criteria.institutes = params.institute.split(',').map(s => s.trim()).filter(s => s.length > 0);
    }
    if (params.quota) {
        criteria.quotas = params.quota.split(',').map(s => parseInt(s.trim(), 10)).filter(id => !isNaN(id));
    }
    if (params.page) {
        criteria.page = parseInt(params.page, 10);
    }
    
    // Pass the candidate's raw category ID to the server.
    // The server (server/data.js getEligibleCategories) is the sole authority for
    // category eligibility expansion (GEN→OPEN, EWS→OPEN+EWS, OBC→OPEN+OBC, etc.).
    if (params.category || params.cat) {
        const candCatId = parseInt(params.category || params.cat, 10);
        if (!isNaN(candCatId)) {
            criteria.candidateCategory = candCatId;
        }
    }
    
    // 1. Determine available colleges based on state filter
    let availableColleges = window.APP_META.institutes;
    if (criteria.states && criteria.states.length > 0) {
        const stateSet = new Set(criteria.states);
        availableColleges = availableColleges.filter(inst => stateSet.has(inst.state));
    }
    availableColleges.sort((a, b) => a.name.localeCompare(b.name));
    
    // 2. Validate selected colleges
    if (criteria.institutes) {
        const availableInstIds = new Set(availableColleges.map(i => String(i.id)));
        const validInstitutes = criteria.institutes.filter(id => availableInstIds.has(String(id)));
        
        if (validInstitutes.length !== criteria.institutes.length) {
            criteria.institutes = validInstitutes; // invalid ones dropped silently from local state
        }
    }
    
    // Check if any filters (other than rank and category) are active
    const hasAdvancedFilters = params.specialisation || params.institute || params.budget || params.stipend || params.bond || params.year || params.round || params.state || params.seats;
    
    container.innerHTML = `
        <div class="container" style="margin-top:2rem;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
                <div>
                    <h1 style="font-size:1.75rem; margin-bottom:0.5rem; font-weight:700;">Search Results <span id="results-count" style="font-size:1.25rem; font-weight:500; color:var(--text-muted); margin-left:0.5rem;"></span></h1>
                    <p class="text-muted" style="margin-bottom:1rem;">Showing best fits for ${getRankShortLabel()} ${rank ? rank.toLocaleString() : 'Not provided'}</p>
                    <div id="active-filters" class="mobile-only" style="display:flex; gap:0.5rem; flex-wrap:wrap; align-items:center;"></div>
                </div>
                
                <div style="display:flex; gap:1rem; align-items:center;">
                    <div class="form-group mb-0" style="display:flex; align-items:center; gap:0.5rem;">
                        <label for="sort-select" style="font-size:0.875rem; color:var(--text-muted); font-weight:500;">Sort By</label>
                        <select id="sort-select" class="form-control" style="padding:0.5rem 2rem 0.5rem 0.75rem; min-width:160px; border-radius:8px;">
                            <option value="fit" ${params.sortBy === 'fit' || !params.sortBy ? 'selected' : ''}>Best Historical Fit</option>
                            <option value="fit_rev" ${params.sortBy === 'fit_rev' ? 'selected' : ''}>Worst Historical Fit</option>
                            <option value="rank" ${params.sortBy === 'rank' ? 'selected' : ''}>Closest to Rank</option>
                            <option value="rank_rev" ${params.sortBy === 'rank_rev' ? 'selected' : ''}>Furthest from Rank</option>
                            <option value="fee" ${params.sortBy === 'fee' ? 'selected' : ''}>Lowest Fee</option>
                            <option value="fee_rev" ${params.sortBy === 'fee_rev' ? 'selected' : ''}>Highest Fee</option>
                            <option value="stipend" ${params.sortBy === 'stipend' ? 'selected' : ''}>Highest Stipend</option>
                            <option value="stipend_rev" ${params.sortBy === 'stipend_rev' ? 'selected' : ''}>Lowest Stipend</option>
                            <option value="bond" ${params.sortBy === 'bond' ? 'selected' : ''}>Lowest Bond</option>
                            <option value="bond_rev" ${params.sortBy === 'bond_rev' ? 'selected' : ''}>Highest Bond</option>
                            <option value="name" ${params.sortBy === 'name' ? 'selected' : ''}>College Name (A-Z)</option>
                            <option value="name_rev" ${params.sortBy === 'name_rev' ? 'selected' : ''}>College Name (Z-A)</option>
                            <option value="course" ${params.sortBy === 'course' ? 'selected' : ''}>Course Name (A-Z)</option>
                            <option value="course_rev" ${params.sortBy === 'course_rev' ? 'selected' : ''}>Course Name (Z-A)</option>
                        </select>
                    </div>
                    
                    <button id="mobile-filter-btn" class="btn btn-outline mobile-drawer-toggle mobile-only" style="margin-bottom:0;">
                        <span>⚙️ Filters</span>
                    </button>
                    
                    <button id="shortlist-all-btn" class="btn btn-primary" style="margin-bottom:0; display:flex; align-items:center; gap:0.5rem;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                        <span class="desktop-only">Shortlist All</span>
                        <span class="mobile-only">All</span>
                    </button>
                    
                    
                </div>
            </div>
            
            
            <div style="display: grid; grid-template-columns: minmax(280px, 1fr) 3fr; gap: 2rem;" class="results-layout">
                <aside class="desktop-filters desktop-only" style="position: sticky; top: 5rem; height: max-content; align-self: start; z-index: 10;">
                    <div class="card" style="padding: 1.5rem; background: var(--bg-surface); border-radius: 12px; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); max-height: calc(100vh - 13rem); overflow-y: auto; overscroll-behavior: contain;">
                        <h3 style="margin-bottom: 1.25rem; font-size: 1.25rem;">Refine Search</h3>
                        
                        <div class="form-group" style="margin-bottom: 1.25rem;">
                            <label class="form-label" style="display:block; margin-bottom:0.5rem; font-weight:500;">${getRankLabel()}</label>
                            <input type="text" inputmode="numeric" pattern="[0-9]*" id="sidebar-rank" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color-dark); border-radius:8px;" value="${params.rank || ''}" placeholder="e.g. 5000">
                        </div>
                        
                        ${getRankLabel() !== 'All India Rank (AIR)' ? `
                        <div class="form-group" style="margin-bottom: 1.25rem;">
                            <label class="form-label" style="display:block; margin-bottom:0.5rem; font-weight:500;">All India Rank (AIR)</label>
                            <input type="text" inputmode="numeric" pattern="[0-9]*" id="sidebar-ai-rank" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color-dark); border-radius:8px;" value="${params.aiRank || ''}" placeholder="e.g. 15000">
                        </div>
                        ` : ''}
                        
                        <div class="form-group" style="margin-bottom: 1.25rem; position: relative;">
                            <label class="form-label" style="display:block; margin-bottom:0.5rem; font-weight:500;">State</label>
                            <button id="state-dropdown-btn" type="button" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color-dark); border-radius:8px; text-align:left; background:white; display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
                                <span id="state-dropdown-label">${criteria.states && criteria.states.length > 0 ? (criteria.states.length === 1 ? criteria.states[0] : `${criteria.states.length} states selected`) : 'All States'}</span>
                                <span>▼</span>
                            </button>
                            <div id="state-dropdown-popover" style="display:none; position:absolute; top:100%; left:0; width:100%; background:white; border:1px solid var(--border-color-dark); border-radius:8px; margin-top:0.25rem; z-index:50; box-shadow:var(--shadow-md); max-height:300px; overflow-y:auto;">
                                <div style="padding:0.75rem; border-bottom:1px solid var(--border-color); position:sticky; top:0; background:white; z-index:2;">
                                    <input type="text" id="state-search-input" class="form-control" placeholder="Search states..." style="width:100%; padding:0.5rem; margin-bottom:0.5rem; border:1px solid var(--border-color); border-radius:4px;">
                                    <div style="display:flex; justify-content:space-between;">
                                        <button type="button" id="state-select-all" class="btn btn-outline" style="padding:0.25rem 0.5rem; font-size:0.75rem; border:none; color:var(--primary-color);">Select All</button>
                                        <button type="button" id="state-clear-all" class="btn btn-outline" style="padding:0.25rem 0.5rem; font-size:0.75rem; border:none; color:var(--danger);">Clear All</button>
                                    </div>
                                </div>
                                <div id="state-checkbox-list" style="padding:0.5rem;">
                                    ${window.APP_META.states.map(state => `
                                        <label style="display:flex; align-items:center; gap:0.5rem; padding:0.5rem; cursor:pointer; font-size:0.875rem;" class="state-option-label">
                                            <input type="checkbox" value="${state}" class="state-checkbox" ${criteria.states && criteria.states.includes(state) ? 'checked' : ''}>
                                            <span class="state-name-text">${state}</span>
                                        </label>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-group" style="margin-bottom: 1.25rem;">
                            <label class="form-label" style="display:block; margin-bottom:0.5rem; font-weight:500;">Historical Year</label>
                            <select id="sidebar-year" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color-dark); border-radius:8px;">
                                <option value="all">All Years</option>
                                <option value="2025" ${params.year === '2025' ? 'selected' : ''}>2025</option>
                                <option value="2024" ${params.year === '2024' ? 'selected' : ''}>2024</option>
                            </select>
                        </div>
                        
                        <div class="form-group" style="margin-bottom: 1.25rem;">
                            <label class="form-label" style="display:block; margin-bottom:0.5rem; font-weight:500;">Historical Round</label>
                            <select id="sidebar-round" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color-dark); border-radius:8px;">
                                <option value="all">All Rounds</option>
                                <option value="1" ${params.round === '1' ? 'selected' : ''}>Round 1</option>
                                <option value="2" ${params.round === '2' ? 'selected' : ''}>Round 2</option>
                                <option value="3" ${params.round === '3' ? 'selected' : ''}>Round 3</option>
                                <option value="4" ${params.round === '4' ? 'selected' : ''}>Round 4</option>
                            </select>
                        </div>
                        
                        <div class="form-group" style="margin-bottom: 1.25rem;">
                            <label class="form-label" style="display:block; margin-bottom:0.5rem; font-weight:500;">Category</label>
                            <select id="sidebar-cat" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color-dark); border-radius:8px;">
                                <option value="">Select Category</option>
                                ${window.APP_META.categories.map(c => `<option value="${c.id}" ${params.category === String(c.id) || params.cat === String(c.id) ? 'selected' : ''}>${c.name}</option>`).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group" style="margin-bottom: 1.25rem; position: relative;">
                            <label class="form-label" style="display:block; margin-bottom:0.5rem; font-weight:500;">Quota</label>
                            <button id="quota-dropdown-btn" type="button" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color-dark); border-radius:8px; text-align:left; background:white; display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
                                <span id="quota-dropdown-label">${criteria.quotas && criteria.quotas.length > 0 ? (criteria.quotas.length === 1 ? window.APP_META.quotas.find(q => String(q.id) === String(criteria.quotas[0]))?.name || '1 quota selected' : `${criteria.quotas.length} quotas selected`) : 'All Quotas'}</span>
                                <span>▼</span>
                            </button>
                            <div id="quota-dropdown-popover" style="display:none; position:absolute; top:100%; left:0; width:100%; background:white; border:1px solid var(--border-color-dark); border-radius:8px; margin-top:0.25rem; z-index:50; box-shadow:var(--shadow-md); max-height:300px; overflow-y:auto;">
                                <div style="padding:0.75rem; border-bottom:1px solid var(--border-color); position:sticky; top:0; background:white; z-index:2;">
                                    <div style="display:flex; justify-content:space-between;">
                                        <button type="button" id="quota-select-all" class="btn btn-outline" style="padding:0.25rem 0.5rem; font-size:0.75rem; border:none; color:var(--primary-color);">Select All</button>
                                        <button type="button" id="quota-clear-all" class="btn btn-outline" style="padding:0.25rem 0.5rem; font-size:0.75rem; border:none; color:var(--danger);">Clear All</button>
                                    </div>
                                </div>
                                <div id="quota-checkbox-list" style="padding:0.5rem;">
                                    ${window.APP_META.quotas.sort((a, b) => a.name.localeCompare(b.name)).map(q => `
                                        <label style="display:flex; align-items:center; gap:0.5rem; padding:0.5rem; cursor:pointer; font-size:0.875rem;" class="quota-option-label">
                                            <input type="checkbox" value="${q.id}" class="quota-checkbox" ${criteria.quotas && criteria.quotas.includes(q.id) ? 'checked' : ''}>
                                            <span class="quota-name-text">${q.short_name || q.name}</span>
                                        </label>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-group" style="margin-bottom: 1.25rem; position: relative;">
                            <label class="form-label" style="display:block; margin-bottom:0.5rem; font-weight:500;">Specialisation</label>
                            <button id="course-dropdown-btn" type="button" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color-dark); border-radius:8px; text-align:left; background:white; display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
                                <span id="course-dropdown-label">${criteria.courses && criteria.courses.length > 0 ? (criteria.courses.length === 1 ? window.APP_META.courses.find(c => String(c.id) === String(criteria.courses[0]))?.name || '1 specialisation selected' : `${criteria.courses.length} specialisations selected`) : 'All Specialisations'}</span>
                                <span>▼</span>
                            </button>
                            <div id="course-dropdown-popover" style="display:none; position:absolute; top:100%; left:0; width:100%; background:white; border:1px solid var(--border-color-dark); border-radius:8px; margin-top:0.25rem; z-index:50; box-shadow:var(--shadow-md); max-height:300px; overflow-y:auto;">
                                <div style="padding:0.75rem; border-bottom:1px solid var(--border-color); position:sticky; top:0; background:white; z-index:2;">
                                    <input type="text" id="course-search-input" class="form-control" placeholder="Search specialisations..." style="width:100%; padding:0.5rem; margin-bottom:0.5rem; border:1px solid var(--border-color); border-radius:4px;">
                                    <div style="display:flex; justify-content:space-between;">
                                        <button type="button" id="course-select-all" class="btn btn-outline" style="padding:0.25rem 0.5rem; font-size:0.75rem; border:none; color:var(--primary-color);">Select All</button>
                                        <button type="button" id="course-clear-all" class="btn btn-outline" style="padding:0.25rem 0.5rem; font-size:0.75rem; border:none; color:var(--danger);">Clear All</button>
                                    </div>
                                </div>
                                <div id="course-checkbox-list" style="padding:0.5rem;">
                                    ${window.APP_META.courses.sort((a, b) => a.name.localeCompare(b.name)).map(c => `
                                        <label style="display:flex; align-items:center; gap:0.5rem; padding:0.5rem; cursor:pointer; font-size:0.875rem;" class="course-option-label">
                                            <input type="checkbox" value="${c.id}" class="course-checkbox" ${criteria.courses && criteria.courses.includes(String(c.id)) ? 'checked' : ''}>
                                            <span class="course-name-text">${c.name}</span>
                                        </label>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-group" style="margin-bottom: 1.25rem; position: relative;">
                            <label class="form-label" style="display:block; margin-bottom:0.5rem; font-weight:500;">Specific College</label>
                            <button id="college-dropdown-btn" type="button" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color-dark); border-radius:8px; text-align:left; background:white; display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
                                <span id="college-dropdown-label">${criteria.institutes && criteria.institutes.length > 0 ? (criteria.institutes.length === 1 ? window.APP_META.institutes.find(i => String(i.id) === String(criteria.institutes[0]))?.name || '1 college selected' : `${criteria.institutes.length} colleges selected`) : 'All Colleges'}</span>
                                <span>▼</span>
                            </button>
                            <div id="college-dropdown-popover" style="display:none; position:absolute; top:100%; left:0; width:100%; background:white; border:1px solid var(--border-color-dark); border-radius:8px; margin-top:0.25rem; z-index:50; box-shadow:var(--shadow-md); max-height:300px; overflow-y:auto;">
                                <div style="padding:0.75rem; border-bottom:1px solid var(--border-color); position:sticky; top:0; background:white; z-index:2;">
                                    <input type="text" id="college-search-input" class="form-control" placeholder="Search colleges..." style="width:100%; padding:0.5rem; margin-bottom:0.5rem; border:1px solid var(--border-color); border-radius:4px;">
                                    <div style="display:flex; justify-content:space-between;">
                                        <button type="button" id="college-select-all" class="btn btn-outline" style="padding:0.25rem 0.5rem; font-size:0.75rem; border:none; color:var(--primary-color);">Select All</button>
                                        <button type="button" id="college-clear-all" class="btn btn-outline" style="padding:0.25rem 0.5rem; font-size:0.75rem; border:none; color:var(--danger);">Clear All</button>
                                    </div>
                                </div>
                                <div id="college-checkbox-list" style="padding:0.5rem;">
                                    ${availableColleges.length > 0 ? availableColleges.map(inst => `
                                        <label style="display:flex; align-items:center; gap:0.5rem; padding:0.5rem; cursor:pointer; font-size:0.875rem;" class="college-option-label">
                                            <input type="checkbox" value="${inst.id}" class="college-checkbox" ${criteria.institutes && criteria.institutes.includes(String(inst.id)) ? 'checked' : ''}>
                                            <span class="college-name-text">${inst.name}</span>
                                        </label>
                                    `).join('') : '<div style="padding:0.5rem; font-size:0.875rem; color:var(--text-muted);">No colleges available for the selected state(s).</div>'}
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-group" style="margin-bottom: 1.25rem;">
                            <label class="form-label text-muted" style="display:block; margin-bottom:0.5rem; font-size:0.875rem;">Min Seats (Category / Total)</label>
                            <select id="sidebar-seats" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px;">
                                <option value="">No Preference</option>
                                <option value="1" ${params.seats === '1' ? 'selected' : ''}>≥ 1 Seat</option>
                                <option value="2" ${params.seats === '2' ? 'selected' : ''}>≥ 2 Seats</option>
                                <option value="3" ${params.seats === '3' ? 'selected' : ''}>≥ 3 Seats</option>
                                <option value="5" ${params.seats === '5' ? 'selected' : ''}>≥ 5 Seats</option>
                                <option value="10" ${params.seats === '10' ? 'selected' : ''}>≥ 10 Seats</option>
                            </select>
                        </div>
                        
                        <div class="form-group" style="margin-bottom: 1.25rem;">
                            <label class="form-label text-muted" style="display:block; margin-bottom:0.5rem; font-size:0.875rem;">Max Budget (Fee)</label>
                            <select id="sidebar-budget" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px;">
                                <option value="">No Preference</option>
                                <option value="1000000" ${params.budget === '1000000' ? 'selected' : ''}>< ₹10 Lakhs/yr</option>
                                <option value="2000000" ${params.budget === '2000000' ? 'selected' : ''}>< ₹20 Lakhs/yr</option>
                                <option value="3000000" ${params.budget === '3000000' ? 'selected' : ''}>< ₹30 Lakhs/yr</option>
                                <option value="4000000" ${params.budget === '4000000' ? 'selected' : ''}>< ₹40 Lakhs/yr</option>
                                <option value="5000000" ${params.budget === '5000000' ? 'selected' : ''}>< ₹50 Lakhs/yr</option>
                                <option value="6000000" ${params.budget === '6000000' ? 'selected' : ''}>< ₹60 Lakhs/yr</option>
                                <option value="7000000" ${params.budget === '7000000' ? 'selected' : ''}>< ₹70 Lakhs/yr</option>
                                <option value="8000000" ${params.budget === '8000000' ? 'selected' : ''}>< ₹80 Lakhs/yr</option>
                                <option value="9000000" ${params.budget === '9000000' ? 'selected' : ''}>< ₹90 Lakhs/yr</option>
                                <option value="10000000" ${params.budget === '10000000' ? 'selected' : ''}>< ₹1 Crore/yr</option>
                            </select>
                        </div>
                        
                        <div class="form-group" style="margin-bottom: 1.25rem;">
                            <label class="form-label text-muted" style="display:block; margin-bottom:0.5rem; font-size:0.875rem;">Min Stipend</label>
                            <select id="sidebar-stipend" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px;">
                                <option value="">No Preference</option>
                                <option value="30000" ${params.stipend === '30000' ? 'selected' : ''}>> ₹30k / month</option>
                                <option value="50000" ${params.stipend === '50000' ? 'selected' : ''}>> ₹50k / month</option>
                                <option value="80000" ${params.stipend === '80000' ? 'selected' : ''}>> ₹80k / month</option>
                            </select>
                        </div>
                        
                        <div class="form-group" style="margin-bottom: 1.25rem;">
                            <label class="form-label text-muted" style="display:block; margin-bottom:0.5rem; font-size:0.875rem;">Service Bond</label>
                            <select id="sidebar-bond" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px;">
                                <option value="">No Preference</option>
                                <option value="no_bond" ${params.bond === 'no_bond' ? 'selected' : ''}>No Bond Strictly</option>
                                <option value="max_yrs_1" ${params.bond === 'max_yrs_1' ? 'selected' : ''}>Max 1 Year</option>
                                <option value="max_yrs_2" ${params.bond === 'max_yrs_2' ? 'selected' : ''}>Max 2 Years</option>
                                <option value="max_pen_1000000" ${params.bond === 'max_pen_1000000' ? 'selected' : ''}>Max Penalty ₹10L</option>
                                <option value="max_pen_3000000" ${params.bond === 'max_pen_3000000' ? 'selected' : ''}>Max Penalty ₹30L</option>
                            </select>
                        </div>
                        <div class="form-group" style="margin-top: 2rem; display: flex; flex-direction: column; gap: 0.75rem;">
                            <button id="sidebar-apply-filters" type="button" class="btn btn-primary" style="width:100%; padding:0.75rem; border-radius:8px;">Apply Filters</button>
                            <button id="sidebar-clear-all" type="button" class="btn btn-outline" style="width:100%; padding:0.75rem; border-radius:8px; color:var(--danger); border-color:var(--danger);">Clear All Filters</button>
                        </div>
                    </div>
                </aside>
                <div id="results-main-column" style="display:flex; flex-direction:column; min-width: 0;">
                    
                    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
                        <div>
                            <h1 style="margin:0; font-size: 1.75rem;">Search Results <span class="text-muted text-sm" style="font-weight:400;" id="results-count"></span></h1>
                            ${rank ? `<div class="text-muted mt-2">Showing best fits for ${getRankShortLabel()} ${rank.toLocaleString()}</div>` : ''}
                        </div>
                    </div>

                    <div id="results-list" style="display:flex; flex-direction:column; gap:1.5rem; margin-bottom:6rem; min-width: 0;">

                    <!-- Skeleton Loading State -->
                    ${Array(3).fill(`
                    <div class="card" style="padding:1.5rem; border-radius:8px;">
                        <div class="skeleton-box" style="width:80px; height:24px; border-radius:4px; margin-bottom:0.75rem;"></div>
                        <div class="skeleton-box" style="width:60%; height:28px; margin-bottom:0.5rem;"></div>
                        <div class="skeleton-box" style="width:40%; height:20px; margin-bottom:1rem;"></div>
                        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:1rem; margin-bottom:1rem;">
                            <div class="skeleton-box" style="height:60px;"></div>
                            <div class="skeleton-box" style="height:60px;"></div>
                            <div class="skeleton-box" style="height:60px;"></div>
                        </div>
                    </div>`).join('')}
                    </div>
                </div>
            </div>
            
            </div>
            <div id="compare-bar" style="position:fixed; bottom:0; left:0; width:100%; background:var(--bg-surface); border-top:1px solid var(--border-color); padding:1rem; box-shadow:0 -4px 12px rgba(0,0,0,0.1); display:none; z-index:100; transition: transform 0.3s ease;">
                <div class="container" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
                    <div style="display:flex; align-items:center; gap:1rem;">
                        <span id="compare-bar-count" style="font-weight:600; font-size:1.125rem;">Comparing 0 / 4</span>
                        <div id="compare-bar-chips" style="display:flex; gap:0.5rem; flex-wrap:wrap;"></div>
                    </div>
                    <div style="display:flex; gap:1rem; align-items:center;">
                        <button id="compare-bar-clear" class="btn btn-outline" style="border:none; color:var(--danger); cursor:pointer;">Clear</button>
                        <button id="compare-bar-cta" class="btn btn-primary" style="padding:0.75rem 1.5rem; border-radius:8px; cursor:pointer; font-weight:600;" disabled>Select at least 2 colleges to compare</button>
                    </div>
                </div>
            </div>
            
            <!-- Mobile Filter Drawer -->
            <div class="drawer-backdrop mobile-only" id="drawer-backdrop"></div>
            <div class="mobile-drawer mobile-only" id="mobile-drawer">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; border-bottom:1px solid var(--border-color); padding-bottom:1rem;">
                    <h3 style="margin:0;">Modify Search</h3>
                    <button id="close-drawer" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:var(--text-muted);">&times;</button>
                </div>
                <div style="display:flex; flex-direction:column; gap:1rem;">
                    <button id="clear-all-mobile" class="btn btn-outline" style="text-align:center; padding:1rem; border-radius:8px; color:var(--danger); border-color:var(--danger);">Clear All Filters</button>
                </div>
            </div>
        </div>
        
        <style>
            @media (max-width: 768px) {
                .results-layout { grid-template-columns: 1fr !important; }
            }
        </style>
    `;
    
    const listContainer = document.getElementById('results-list');
    const filtersContainer = document.getElementById('active-filters');
    const compareBar = document.getElementById('compare-bar');
    const sortSelect = document.getElementById('sort-select');
    
    // Drawer Logic
    const drawer = document.getElementById('mobile-drawer');
    const backdrop = document.getElementById('drawer-backdrop');
    const toggleBtn = document.getElementById('mobile-filter-btn');
    const closeBtn = document.getElementById('close-drawer');
    
    const openDrawer = () => document.body.classList.add('drawer-open');
    const closeDrawer = () => document.body.classList.remove('drawer-open');
    
    toggleBtn.addEventListener('click', openDrawer);
    closeBtn.addEventListener('click', closeDrawer);
    backdrop.addEventListener('click', closeDrawer);
    document.getElementById('clear-all-mobile').addEventListener('click', () => {
        navigate('/results');
        closeDrawer();
    });
    
    const sidebarClearAll = document.getElementById('sidebar-clear-all');
    if (sidebarClearAll) {
        sidebarClearAll.addEventListener('click', () => {
            navigate('/results');
        });
    }
    
    // Add active filter chips
    if (hasAdvancedFilters) {
        Object.entries(params).forEach(([key, val]) => {
            if (key !== 'rank' && key !== 'category' && key !== 'state' && key !== 'institute' && key !== 'specialisation') {
                let displayVal = val;
                if (key === 'budget') displayVal = `Max Fee: ₹${parseInt(val).toLocaleString()}`;
                if (key === 'stipend') displayVal = `Min Stipend: ₹${parseInt(val).toLocaleString()}`;
                if (key === 'bond') displayVal = `Bond: ${val}`;
                if (key === 'year') displayVal = `Year: ${val}`;
                if (key === 'round') displayVal = `Round: ${val}`;
                
                const chip = document.createElement('span');
                chip.style.background = 'var(--bg-surface-hover)';
                chip.style.padding = '0.375rem 0.75rem';
                chip.style.borderRadius = '16px';
                chip.style.fontSize = '0.875rem';
                chip.style.border = '1px solid var(--border-color)';
                chip.style.display = 'inline-flex';
                chip.style.alignItems = 'center';
                chip.style.gap = '0.5rem';
                chip.innerHTML = `${displayVal} <span style="cursor:pointer; color:var(--text-muted); font-weight:bold;" data-filter="${key}">&times;</span>`;
                filtersContainer.appendChild(chip);
            }
        });
        
        if (criteria.states && criteria.states.length > 0) {
            criteria.states.forEach(state => {
                const chip = document.createElement('span');
                chip.style.background = 'var(--bg-surface-hover)';
                chip.style.padding = '0.375rem 0.75rem';
                chip.style.borderRadius = '16px';
                chip.style.fontSize = '0.875rem';
                chip.style.border = '1px solid var(--border-color)';
                chip.style.display = 'inline-flex';
                chip.style.alignItems = 'center';
                chip.style.gap = '0.5rem';
                chip.innerHTML = `${state} <span style="cursor:pointer; color:var(--text-muted); font-weight:bold;" data-state-filter="${state}">&times;</span>`;
                filtersContainer.appendChild(chip);
            });
        }

        if (criteria.institutes && criteria.institutes.length > 0) {
            criteria.institutes.forEach(instId => {
                const instName = window.APP_META.institutes.find(i => String(i.id) === String(instId))?.name || instId;
                const chip = document.createElement('span');
                chip.style.background = 'var(--bg-surface-hover)';
                chip.style.padding = '0.375rem 0.75rem';
                chip.style.borderRadius = '16px';
                chip.style.fontSize = '0.875rem';
                chip.style.border = '1px solid var(--border-color)';
                chip.style.display = 'inline-flex';
                chip.style.alignItems = 'center';
                chip.style.gap = '0.5rem';
                chip.innerHTML = `${instName} <span style="cursor:pointer; color:var(--text-muted); font-weight:bold;" data-college-filter="${instId}">&times;</span>`;
                filtersContainer.appendChild(chip);
            });
        }
        
        if (criteria.courses && criteria.courses.length > 0) {
            criteria.courses.forEach(courseId => {
                const courseName = window.APP_META.courses.find(c => String(c.id) === String(courseId))?.name || courseId;
                const chip = document.createElement('span');
                chip.style.background = 'var(--bg-surface-hover)';
                chip.style.padding = '0.375rem 0.75rem';
                chip.style.borderRadius = '16px';
                chip.style.fontSize = '0.875rem';
                chip.style.border = '1px solid var(--border-color)';
                chip.style.display = 'inline-flex';
                chip.style.alignItems = 'center';
                chip.style.gap = '0.5rem';
                chip.innerHTML = `${courseName} <span style="cursor:pointer; color:var(--text-muted); font-weight:bold;" data-course-filter="${courseId}">&times;</span>`;
                filtersContainer.appendChild(chip);
            });
        }
        
        if (criteria.quotas && criteria.quotas.length > 0) {
            criteria.quotas.forEach(quotaId => {
                const qObj = window.APP_META.quotas.find(q => String(q.id) === String(quotaId));
                const quotaName = qObj ? (qObj.short_name || qObj.name) : quotaId;
                const chip = document.createElement('span');
                chip.style.background = 'var(--bg-surface-hover)';
                chip.style.padding = '0.375rem 0.75rem';
                chip.style.borderRadius = '16px';
                chip.style.fontSize = '0.875rem';
                chip.style.border = '1px solid var(--border-color)';
                chip.style.display = 'inline-flex';
                chip.style.alignItems = 'center';
                chip.style.gap = '0.5rem';
                chip.innerHTML = `${quotaName} <span style="cursor:pointer; color:var(--text-muted); font-weight:bold;" data-quota-filter="${quotaId}">&times;</span>`;
                filtersContainer.appendChild(chip);
            });
        }
        
        // Add Clear All chip
        const clearAll = document.createElement('span');
        clearAll.style.color = 'var(--primary-color)';
        clearAll.style.fontSize = '0.875rem';
        clearAll.style.fontWeight = '600';
        clearAll.style.cursor = 'pointer';
        clearAll.style.padding = '0.375rem 0.5rem';
        clearAll.textContent = 'Clear all';
        clearAll.addEventListener('click', () => {
            navigate('/results', { rank: params.rank, category: params.category });
        });
        filtersContainer.appendChild(clearAll);
    }

    filtersContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'SPAN' && e.target.dataset.filter) {
            const newParams = { ...params };
            delete newParams[e.target.dataset.filter];
            delete newParams.page;
            navigate('/results', newParams);
        }
        if (e.target.tagName === 'SPAN' && e.target.dataset.stateFilter) {
            const stateToRemove = e.target.dataset.stateFilter;
            const currentStates = criteria.states || [];
            const newStates = currentStates.filter(s => s !== stateToRemove);
            const newParams = { ...params };
            if (newStates.length > 0) {
                newParams.state = newStates.join(',');
            } else {
                delete newParams.state;
            }
            delete newParams.page;
            navigate('/results', newParams);
        }
        if (e.target.tagName === 'SPAN' && e.target.dataset.collegeFilter) {
            const collegeToRemove = e.target.dataset.collegeFilter;
            const currentColleges = criteria.institutes || [];
            const newColleges = currentColleges.filter(s => String(s) !== String(collegeToRemove));
            const newParams = { ...params };
            if (newColleges.length > 0) {
                newParams.institute = newColleges.join(',');
            } else {
                delete newParams.institute;
            }
            delete newParams.page;
            navigate('/results', newParams);
        }
        if (e.target.tagName === 'SPAN' && e.target.dataset.courseFilter) {
            const courseToRemove = e.target.dataset.courseFilter;
            const currentCourses = criteria.courses || [];
            const newCourses = currentCourses.filter(s => String(s) !== String(courseToRemove));
            const newParams = { ...params };
            if (newCourses.length > 0) {
                newParams.specialisation = newCourses.join(',');
            } else {
                delete newParams.specialisation;
            }
            delete newParams.page;
            navigate('/results', newParams);
        }
        if (e.target.tagName === 'SPAN' && e.target.dataset.quotaFilter) {
            const quotaToRemove = e.target.dataset.quotaFilter;
            const currentQuotas = criteria.quotas || [];
            const newQuotas = currentQuotas.filter(s => String(s) !== String(quotaToRemove));
            const newParams = { ...params };
            if (newQuotas.length > 0) {
                newParams.quota = newQuotas.join(',');
            } else {
                delete newParams.quota;
            }
            delete newParams.page;
            navigate('/results', newParams);
        }
    });

    let unsubscribe = null;
    let localData = []; // Store current page results for state sync
    let totalMatches = 0;
    
    // Pagination state
    let cursorHistory = [];
    let currentCursor = null;
    let nextCursor = null;
    let currentPage = params.page ? parseInt(params.page, 10) : 1;
    let hasMore = false;
    let isLoading = false;
    const PAGE_SIZE = 50; // matches API default
    
    // Ensure Pagination containers exist
    let topPaginationContainer = document.getElementById('top-pagination-container');
    if (!topPaginationContainer) {
        topPaginationContainer = document.createElement('div');
        topPaginationContainer.id = 'top-pagination-container';
        listContainer.parentNode.insertBefore(topPaginationContainer, listContainer);
    }
    
    let bottomPaginationContainer = document.getElementById('bottom-pagination-container');
    if (!bottomPaginationContainer) {
        bottomPaginationContainer = document.createElement('div');
        bottomPaginationContainer.id = 'bottom-pagination-container';
        listContainer.parentNode.insertBefore(bottomPaginationContainer, listContainer.nextSibling);
    }
    
    function renderPagination() {
        if (totalMatches === 0) {
            topPaginationContainer.innerHTML = '';
            bottomPaginationContainer.innerHTML = '';
            return;
        }
        
        const html = `
            <div style="display:flex; justify-content:center; align-items:center; gap:1rem; padding:1.5rem 0;">
                <button class="btn btn-outline btn-prev" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>
                <span style="font-weight:600; font-size:1rem; color:var(--text);">Page ${currentPage}</span>
                <button class="btn btn-outline btn-next" ${!hasMore ? 'disabled' : ''}>Next</button>
            </div>
        `;
        
        topPaginationContainer.innerHTML = html;
        bottomPaginationContainer.innerHTML = html;
        
        // Add event listeners
        document.querySelectorAll('.btn-prev').forEach(btn => {
            btn.addEventListener('click', () => {
                if (currentPage > 1 && !isLoading) {
                    const newParams = { ...params };
                    newParams.page = currentPage - 1;
                    navigate('/results', newParams);
                }
            });
        });
        
        document.querySelectorAll('.btn-next').forEach(btn => {
            btn.addEventListener('click', () => {
                if (hasMore && !isLoading) {
                    const newParams = { ...params };
                    newParams.page = currentPage + 1;
                    navigate('/results', newParams);
                }
            });
        });
    }

    // Execute Search
    async function loadResults(isNavigating = false) {
        if (isLoading) return;
        isLoading = true;
        
        if (!isNavigating && !params.page) {
            currentCursor = null;
            cursorHistory = [];
            currentPage = 1;
        }
        
        listContainer.innerHTML = '<div class="text-center p-4">Loading options...</div>';
        const buttons = document.querySelectorAll('.btn-prev, .btn-next');
        buttons.forEach(b => b.disabled = true);
        
        const sortBy = sortSelect.value;
        
        try {
            const result = await engine.search({rank, aiRank}, criteria, currentCursor, sortBy);
            nextCursor = result.pagination.nextCursor;
            hasMore = result.pagination.hasMore;
            totalMatches = result.pagination.totalMatching;
            localData = result.items; // replace instead of append
            
            listContainer.innerHTML = '';
            renderItems(result.items);
            renderPagination();
            
            // Update counter
            const countEl = document.getElementById('results-count');
            if (countEl) {
                if (totalMatches === 0) {
                    countEl.textContent = `(0 options)`;
                } else {
                    const startIdx = (currentPage - 1) * PAGE_SIZE + 1;
                    const endIdx = startIdx + result.items.length - 1;
                    countEl.textContent = `(Showing ${startIdx}–${endIdx} of ${totalMatches.toLocaleString()} matching options)`;
                }
            }
            
            if (isNavigating) {
                // Scroll to top of results container
                const listTop = listContainer.getBoundingClientRect().top + window.scrollY - 100;
                window.scrollTo({ top: listTop, behavior: 'smooth' });
            }
            
            // Handle zero results
            if (localData.length === 0) {
                renderZeroResults();
            }
            
        } catch (e) {
            listContainer.innerHTML = `
                <div class="text-danger p-4 card" style="background:var(--bg-surface);">
                    Failed to load options: ${e.message}
                    <div style="margin-top:1rem;">
                        <button class="btn btn-outline" onclick="window.location.reload()">Refresh Page</button>
                    </div>
                </div>
            `;
            // Restore state on failure
            if (isNavigating) {
                if (currentPage > 1 && !hasMore) {
                    // if we tried to go next but failed, we should probably just reset loading state,
                    // but fixing state rollback properly:
                    // Actually, if we failed, we just show the error in the listContainer. 
                    // The user can't easily recover the previous DOM without re-fetching, 
                    // so we leave the error message there and they can navigate again (which triggers a refetch).
                }
            }
            renderPagination(); // re-enable buttons so they can try again
        } finally {
            isLoading = false;
        }
    }
    
    sortSelect.addEventListener('change', () => {
        const newParams = { ...params };
        delete newParams.page; // reset to page 1 on sort change
        newParams.sortBy = sortSelect.value;
        navigate('/results', newParams);
    });
    
    // Initial load
    loadResults(false);
    
    function renderZeroResults() {
        listContainer.innerHTML = `
            <div class="text-center p-4 card" style="background:var(--bg-surface); padding:3rem !important;">
                <h3 style="margin-bottom:1rem; font-size:1.5rem;">No options match all your filters</h3>
                <p class="text-muted mb-4">You have applied restrictive filters that resulted in zero matches. Consider relaxing some of your constraints:</p>
                <div style="display:flex; gap:1rem; justify-content:center; flex-wrap:wrap;">
                    ${params.budget ? `<button class="btn btn-outline relax-filter" data-key="budget">Remove Budget Limit</button>` : ''}
                    ${params.stipend ? `<button class="btn btn-outline relax-filter" data-key="stipend">Remove Stipend Limit</button>` : ''}
                    ${params.bond ? `<button class="btn btn-outline relax-filter" data-key="bond">Remove Bond Limit</button>` : ''}
                    ${params.course ? `<button class="btn btn-outline relax-filter" data-key="course">Search Any Branch</button>` : ''}
                </div>
            </div>
        `;
        
        document.querySelectorAll('.relax-filter').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const newParams = { ...params };
                delete newParams[e.target.dataset.key];
                delete newParams.page;
                navigate('/results', newParams);
            });
        });
    }
    
    function renderItems(items) {
        items.forEach(opt => {
            const fit = opt._fit;
            
            let badgeClass = 'var(--warning-light)';
            let badgeText = 'var(--warning)';
            if (fit.classification === 'Historically favorable') {
                badgeClass = 'var(--success-light)';
                badgeText = 'var(--success)';
            } else if (fit.classification === 'Historically competitive') {
                badgeClass = 'var(--warning-light)';
                badgeText = 'var(--warning)';
            } else if (fit.classification === 'Historically difficult') {
                badgeClass = 'var(--danger-light)';
                badgeText = 'var(--danger)';
            } else {
                badgeClass = 'var(--bg-main)';
                badgeText = 'var(--text-muted)';
            }
            
            const card = document.createElement('div');
            card.className = 'card result-card';
            card.dataset.id = opt.id;
            card.dataset.identity = `${opt.institute.id}_${opt.course.id}`;
            card.style.background = 'var(--bg-surface)';
            card.style.padding = '1.5rem';
            card.style.borderRadius = '12px';
            card.style.border = '1px solid var(--border-color)';
            card.style.boxShadow = 'var(--shadow-sm)';
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.gap = '1rem';
            card.style.transition = 'box-shadow 0.2s';
            
            const marginText = fit.rankMarginLatest !== null ? 
                (fit.rankMarginLatest >= 0 ? `+${Math.abs(fit.rankMarginLatest).toLocaleString()}` : `-${Math.abs(fit.rankMarginLatest).toLocaleString()}`) : 
                'Not available';
            const marginColor = fit.rankMarginLatest >= 0 ? 'var(--success)' : 'var(--danger)';
            
            const analyzed = opt._analyzedCutoffs;
            const aiRankText = analyzed && analyzed.latestAIRank ? ` (AIR: ${analyzed.latestAIRank.toLocaleString()})` : '';
            const latestCutoffText = analyzed && analyzed.latestYear && analyzed.latestRound && analyzed.latestClosingRank != null ? 
                `${analyzed.latestYear} R${analyzed.latestRound}: ${analyzed.latestClosingRank.toLocaleString()}${aiRankText}` : 
                'Not available';
                
                        const isHistorical = (params.year && params.year !== 'all') || (params.round && params.round !== 'all');
            const cutoffLabelText = isHistorical ? 'Selected Cutoff' : `Latest Cutoff (${getRankShortLabel()})`;
            const feeVal = opt.financials.feeRaw || 'Not available';
            const stipendVal = opt.financials.stipendRaw || 'Not available';
            const bondVal = opt.financials.bondYears ? `${opt.financials.bondYears} Year(s)` : (opt.financials.bondYears === 0 ? 'No Bond' : 'Not available');

            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem;">
                    <div>
                        <div style="display:flex; gap:0.5rem; align-items:center; margin-bottom:0.75rem;">
                            <span style="display:inline-block; padding:0.25rem 0.5rem; border-radius:4px; font-size:0.75rem; font-weight:600; background: ${badgeClass}; color: ${badgeText};">${fit.classification.toUpperCase()}</span>
                            <span title="Confidence level based on historical observations" style="font-size:0.75rem; color:var(--text-muted);">Data Confidence: <strong>${opt.cutoffs ? fit.confidence || 'Medium' : 'Insufficient'}</strong></span>
                        </div>
                        <h3 style="margin-bottom:0.25rem; font-size:1.25rem;">${opt.institute.name}, ${opt.institute.state}</h3>
                        <div style="font-size:1.125rem; font-weight:600; margin-bottom:0.5rem; color:var(--text);">${opt.course.name}</div>
                        <div style="font-size:0.875rem; color:var(--text-muted); font-weight:500;">
                            ${opt.quota.short_name} &middot; ${opt.category.name}
                        </div>
                    </div>
                </div>
                
                <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:1rem; padding:1.25rem; background:var(--bg-main); border-radius:8px; margin-bottom:1rem; font-size:0.875rem; border:1px solid var(--border-color);">
                    <div>
                        <div class="text-muted" style="margin-bottom:0.25rem;">${cutoffLabelText}</div>
                        <div style="font-weight:600;">${latestCutoffText}</div>
                    </div>
                    <div>
                        <div class="text-muted" style="margin-bottom:0.25rem;">Your ${getRankShortLabel()}</div>
                        <div style="font-weight:600;">${rank ? rank.toLocaleString() : 'Not provided'}</div>
                    </div>
                    <div>
                        <div class="text-muted" style="margin-bottom:0.25rem;">Rank Margin</div>
                        <div style="font-weight:600; color:${marginColor}">${marginText}</div>
                    </div>
                </div>
                
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap:1rem; padding-bottom:1.5rem; border-bottom:1px solid var(--border-color); font-size:0.875rem;">
                    <div>
                        <div class="text-muted" style="margin-bottom:0.25rem;">Fee</div>
                        <div class="font-semibold">${feeVal} ${opt.financials.feeHasCaveat ? '<span title="Subject to conditions" style="color:var(--warning)">⚠️</span>' : ''}</div>
                    </div>
                    <div>
                        <div class="text-muted" style="margin-bottom:0.25rem;">Stipend</div>
                        <div class="font-semibold">${stipendVal} ${opt.financials.stipendHasCaveat ? '<span title="Subject to change" style="color:var(--warning)">⚠️</span>' : ''}</div>
                    </div>
                    <div>
                        <div class="text-muted" style="margin-bottom:0.25rem;">Bond</div>
                        <div class="font-semibold">${bondVal}</div>
                    </div>
                </div>
                
                <div style="display:flex; gap:1rem; padding-top:1rem; flex-wrap:wrap;" class="action-buttons">
                    <a href="#/college/${opt.id}?rank=${rank || ''}&year=${params.year || 'all'}&round=${params.round || 'all'}" class="btn btn-primary" style="padding:0.75rem 1.25rem; border-radius:8px; font-weight:600; font-size:0.875rem; text-decoration:none; background:var(--primary-color); color:white;">View Details</a>
                    <button class="btn btn-outline btn-compare" data-id="${opt.id}" style="padding:0.75rem 1.25rem; border:1px solid var(--border-color); background:transparent; border-radius:8px; cursor:pointer; font-size:0.875rem; font-weight:600; min-width:110px;">Compare</button>
                    <button class="btn btn-outline btn-shortlist" data-id="${opt.id}" data-identity="${opt.institute.id}_${opt.course.id}" style="padding:0.75rem 1.25rem; border:1px solid var(--border-color); background:transparent; border-radius:8px; cursor:pointer; font-size:0.875rem; font-weight:600; min-width:130px;">+ Shortlist</button>
                </div>
            `;
            listContainer.appendChild(card);
        });
        
        // Rebind state tracking
        if (unsubscribe) unsubscribe();
        import('../../state.js').then(module => {
            const syncUI = (state) => {
                // Sync Cards
                document.querySelectorAll('.result-card').forEach(card => {
                    const id = parseInt(card.dataset.id, 10);
                    const identity = card.dataset.identity;
                    const btnS = card.querySelector('.btn-shortlist');
                    const btnC = card.querySelector('.btn-compare');
                    
                    if (state.shortlist.some(i => i.identity === identity || i.id === id)) {
                        btnS.textContent = '✓ Shortlisted';
                        btnS.classList.replace('btn-outline', 'btn-primary');
                    } else {
                        btnS.textContent = '+ Shortlist';
                        btnS.classList.replace('btn-primary', 'btn-outline');
                    }
                    
                    if (state.compare.includes(id)) {
                        btnC.innerHTML = '✓ Comparing';
                        btnC.classList.replace('btn-outline', 'btn-primary');
                    } else {
                        btnC.innerHTML = 'Compare';
                        btnC.classList.replace('btn-primary', 'btn-outline');
                    }
                });
                
                // Sync Floating Compare Bar
                if (state.compare.length === 0) {
                    compareBar.style.display = 'none';
                } else {
                    compareBar.style.display = 'block';
                    
                    const countSpan = document.getElementById('compare-bar-count');
                    const ctaBtn = document.getElementById('compare-bar-cta');
                    const chipsDiv = document.getElementById('compare-bar-chips');
                    
                    countSpan.textContent = `Comparing ${state.compare.length} / 4`;
                    
                    if (state.compare.length < 2) {
                        ctaBtn.textContent = 'Select at least 2 colleges to compare';
                        ctaBtn.disabled = true;
                    } else {
                        ctaBtn.textContent = `Compare ${state.compare.length}`;
                        ctaBtn.disabled = false;
                        ctaBtn.onclick = () => window.location.hash = '#/compare';
                    }
                    
                    // Render concise chips (Lookup names from localData or make async calls)
                    chipsDiv.innerHTML = '';
                    state.compare.forEach(id => {
                        const opt = localData.find(o => o.id === id);
                        if (opt) {
                            const name = opt.institute.name.split(' ')[0] + '...'; // Shorten
                            const chip = document.createElement('div');
                            chip.style.background = 'var(--bg-main)';
                            chip.style.padding = '0.375rem 0.75rem';
                            chip.style.borderRadius = '16px';
                            chip.style.fontSize = '0.75rem';
                            chip.style.display = 'flex';
                            chip.style.alignItems = 'center';
                            chip.style.gap = '0.5rem';
                            chip.style.border = '1px solid var(--border-color)';
                            chip.innerHTML = `
                                <span>${name}</span>
                                <span style="cursor:pointer; color:var(--text-muted); font-weight:bold; font-size:1rem; padding:0 0.25rem;" class="remove-compare" data-id="${id}">&times;</span>
                            `;
                            chipsDiv.appendChild(chip);
                        }
                    });
                }
            };
            
            unsubscribe = module.subscribe(syncUI);
            syncUI(module.state); // Initial sync
            
            // Bind event listener for shortlist/compare buttons if not already bound
            if (!listContainer.dataset.eventsBound) {
                listContainer.addEventListener('click', (e) => {
                    if (e.target.classList.contains('btn-shortlist')) {
                        const id = parseInt(e.target.dataset.id, 10);
                        const identity = e.target.dataset.identity;
                        module.toggleShortlist(id, identity);
                    }
                    if (e.target.classList.contains('btn-compare')) {
                        const id = parseInt(e.target.dataset.id, 10);
                        const res = module.toggleCompare(id);
                        if (res && res.error) {
                            alert(res.error);
                        }
                    }
                });
                listContainer.dataset.eventsBound = 'true';
            }
        });
    }

    document.getElementById('compare-bar-clear').addEventListener('click', () => {
        import('../../state.js').then(module => module.clearCompare());
    });
    
    document.getElementById('compare-bar-chips').addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-compare')) {
            const id = parseInt(e.target.dataset.id, 10);
            import('../../state.js').then(module => module.toggleCompare(id));
        }
    });


    // Desktop Sidebar Filter Real-time Events
    const getSelectedStates = () => {
        const checkboxes = document.querySelectorAll('.state-checkbox:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    };

    const getSelectedColleges = () => {
        const checkboxes = document.querySelectorAll('.college-checkbox:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    };

    const getSelectedCourses = () => {
        const checkboxes = document.querySelectorAll('.course-checkbox:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    };

    const handleSidebarChange = () => {
        const rankStr = document.getElementById('sidebar-rank').value;
        const aiRankEl = document.getElementById('sidebar-ai-rank');
        const aiRankStr = aiRankEl ? aiRankEl.value : null;
        const cat = document.getElementById('sidebar-cat').value;
        const budget = document.getElementById('sidebar-budget').value;
        const stipend = document.getElementById('sidebar-stipend').value;
        const bond = document.getElementById('sidebar-bond').value;
        const year = document.getElementById('sidebar-year').value;
        const round = document.getElementById('sidebar-round').value;
        const seats = document.getElementById('sidebar-seats') ? document.getElementById('sidebar-seats').value : '';
        const selectedStates = getSelectedStates();
        const selectedColleges = getSelectedColleges();
        const selectedCourses = getSelectedCourses();
        const selectedQuotas = Array.from(document.querySelectorAll('.quota-checkbox:checked')).map(cb => cb.value);
        
        const searchParams = {};
        if (rankStr && parseInt(rankStr, 10) > 0) searchParams.rank = rankStr;
        if (aiRankStr && parseInt(aiRankStr, 10) > 0) searchParams.aiRank = aiRankStr;
        if (cat) searchParams.category = cat;
        if (budget) searchParams.budget = budget;
        if (stipend) searchParams.stipend = stipend;
        if (bond) searchParams.bond = bond;
        if (year && year !== 'all') searchParams.year = year;
        if (round && round !== 'all') searchParams.round = round;
        if (seats) searchParams.seats = seats;
        if (selectedStates.length > 0) searchParams.state = selectedStates.join(',');
        if (selectedColleges.length > 0) searchParams.institute = selectedColleges.join(',');
        if (selectedCourses.length > 0) searchParams.specialisation = selectedCourses.join(',');
        if (selectedQuotas.length > 0) searchParams.quota = selectedQuotas.join(',');
        
        navigate('/results', searchParams);
    };

    const shortlistAllBtn = document.getElementById('shortlist-all-btn');
    if (shortlistAllBtn) {
        shortlistAllBtn.addEventListener('click', async () => {
            if (totalMatches === 0) {
                alert("No options to shortlist.");
                return;
            }
            
            const originalText = shortlistAllBtn.innerHTML;
            shortlistAllBtn.innerHTML = '<span>Loading...</span>';
            shortlistAllBtn.disabled = true;
            
            try {
                const optionsToShortlist = await engine.getIdentities(rank, criteria);
                const module = await import('../../state.js');
                module.addMultipleToShortlist(optionsToShortlist);
                
                shortlistAllBtn.innerHTML = '<span>✅ Added</span>';
            } catch (err) {
                console.error(err);
                alert("Failed to shortlist: " + err.message);
                shortlistAllBtn.innerHTML = originalText;
            } finally {
                setTimeout(() => {
                    shortlistAllBtn.innerHTML = originalText;
                    shortlistAllBtn.disabled = false;
                }, 2000);
            }
        });
    }

    const applyFiltersBtn = document.getElementById('sidebar-apply-filters');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', handleSidebarChange);
    }
    
    // Quota Filter Dropdown Logic
    const quotaBtn = document.getElementById('quota-dropdown-btn');
    const quotaPopover = document.getElementById('quota-dropdown-popover');
    if (quotaBtn && quotaPopover) {
        quotaBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            quotaPopover.style.display = quotaPopover.style.display === 'none' ? 'block' : 'none';
        });
        
        document.addEventListener('click', (e) => {
            if (!quotaPopover.contains(e.target) && !quotaBtn.contains(e.target)) {
                quotaPopover.style.display = 'none';
            }
        });
        
        quotaPopover.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        const selectAllBtn = document.getElementById('quota-select-all');
        const clearAllBtn = document.getElementById('quota-clear-all');
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => {
                document.querySelectorAll('.quota-option-label').forEach(label => {
                    if (label.style.display !== 'none') {
                        const cb = label.querySelector('.quota-checkbox');
                        if (!cb.checked) {
                            cb.checked = true;
                        }
                    }
                });
            });
        }
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => {
                document.querySelectorAll('.quota-checkbox').forEach(cb => {
                    if (cb.checked) cb.checked = false;
                });
            });
        }
    }

    // State Filter Dropdown Logic
    const stateBtn = document.getElementById('state-dropdown-btn');
    const statePopover = document.getElementById('state-dropdown-popover');
    if (stateBtn && statePopover) {
        stateBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            statePopover.style.display = statePopover.style.display === 'none' ? 'block' : 'none';
        });
        
        // Close popover when clicking outside
        document.addEventListener('click', (e) => {
            if (!statePopover.contains(e.target) && !stateBtn.contains(e.target)) {
                statePopover.style.display = 'none';
            }
        });
        
        // Stop propagation inside popover to prevent closing
        statePopover.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // Search functionality
        const stateSearch = document.getElementById('state-search-input');
        if (stateSearch) {
            stateSearch.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const labels = document.querySelectorAll('.state-option-label');
                labels.forEach(label => {
                    const text = label.querySelector('.state-name-text').textContent.toLowerCase();
                    label.style.display = text.includes(term) ? 'flex' : 'none';
                });
            });
        }
        
        // Select All / Clear All
        const selectAllBtn = document.getElementById('state-select-all');
        const clearAllBtn = document.getElementById('state-clear-all');
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => {
                let changed = false;
                document.querySelectorAll('.state-option-label').forEach(label => {
                    if (label.style.display !== 'none') {
                        const cb = label.querySelector('.state-checkbox');
                        if (!cb.checked) {
                            cb.checked = true;
                            changed = true;
                        }
                    }
                });
                // if (changed) handleSidebarChange();
            });
        }
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => {
                let changed = false;
                document.querySelectorAll('.state-checkbox').forEach(cb => {
                    if (cb.checked) {
                        cb.checked = false;
                        changed = true;
                    }
                });
                // if (changed) handleSidebarChange();
            });
        }
    }

    // College Filter Dropdown Logic
    const collegeBtn = document.getElementById('college-dropdown-btn');
    const collegePopover = document.getElementById('college-dropdown-popover');
    if (collegeBtn && collegePopover) {
        collegeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            collegePopover.style.display = collegePopover.style.display === 'none' ? 'block' : 'none';
        });
        
        document.addEventListener('click', (e) => {
            if (!collegePopover.contains(e.target) && !collegeBtn.contains(e.target)) {
                collegePopover.style.display = 'none';
            }
        });
        
        collegePopover.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        const collegeSearch = document.getElementById('college-search-input');
        if (collegeSearch) {
            collegeSearch.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const labels = document.querySelectorAll('.college-option-label');
                labels.forEach(label => {
                    const text = label.querySelector('.college-name-text').textContent.toLowerCase();
                    label.style.display = text.includes(term) ? 'flex' : 'none';
                });
            });
        }
        
        const selectAllBtn = document.getElementById('college-select-all');
        const clearAllBtn = document.getElementById('college-clear-all');
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => {
                let changed = false;
                document.querySelectorAll('.college-option-label').forEach(label => {
                    if (label.style.display !== 'none') {
                        const cb = label.querySelector('.college-checkbox');
                        if (!cb.checked) {
                            cb.checked = true;
                            changed = true;
                        }
                    }
                });
                // if (changed) handleSidebarChange();
            });
        }
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => {
                let changed = false;
                document.querySelectorAll('.college-checkbox').forEach(cb => {
                    if (cb.checked) {
                        cb.checked = false;
                        changed = true;
                    }
                });
                // if (changed) handleSidebarChange();
            });
        }
    }
    
    // Course/Specialisation Filter Dropdown Logic
    const courseBtn = document.getElementById('course-dropdown-btn');
    const coursePopover = document.getElementById('course-dropdown-popover');
    if (courseBtn && coursePopover) {
        courseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            coursePopover.style.display = coursePopover.style.display === 'none' ? 'block' : 'none';
        });
        
        document.addEventListener('click', (e) => {
            if (!coursePopover.contains(e.target) && !courseBtn.contains(e.target)) {
                coursePopover.style.display = 'none';
            }
        });
        
        coursePopover.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        const courseSearch = document.getElementById('course-search-input');
        if (courseSearch) {
            courseSearch.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const labels = document.querySelectorAll('.course-option-label');
                labels.forEach(label => {
                    const text = label.querySelector('.course-name-text').textContent.toLowerCase();
                    label.style.display = text.includes(term) ? 'flex' : 'none';
                });
            });
        }
        
        const selectAllBtn = document.getElementById('course-select-all');
        const clearAllBtn = document.getElementById('course-clear-all');
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => {
                let changed = false;
                document.querySelectorAll('.course-option-label').forEach(label => {
                    if (label.style.display !== 'none') {
                        const cb = label.querySelector('.course-checkbox');
                        if (!cb.checked) {
                            cb.checked = true;
                            changed = true;
                        }
                    }
                });
                // if (changed) handleSidebarChange();
            });
        }
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => {
                let changed = false;
                document.querySelectorAll('.course-checkbox').forEach(cb => {
                    if (cb.checked) {
                        cb.checked = false;
                        changed = true;
                    }
                });
                // if (changed) handleSidebarChange();
            });
        }
    }
    
    const originalHashChange = window.onhashchange;

    window.addEventListener('hashchange', function cleanup() {
        if (unsubscribe) unsubscribe();
        closeDrawer(); // ensure mobile drawer closes
        window.removeEventListener('hashchange', cleanup);
    });
}
