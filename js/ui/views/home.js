import { navigate } from '../../router.js';

export function renderHome(container, params = {}) {
    const meta = window.APP_META; // populated on load
    
    container.innerHTML = `
        <div class="hero" style="background-color: var(--primary-color); color: white; padding: 5rem 1rem; text-align: center; margin-bottom: 2rem;">
            <div class="container">
                <h1 style="color: white; font-size: 3rem; margin-bottom: 1.5rem; font-weight:800; letter-spacing:-0.025em;">NEET PG Counselling Decision Tool</h1>
                <p style="font-size: 1.25rem; opacity: 0.9; max-width: 600px; margin: 0 auto; line-height:1.6;">Explore colleges, branches, and historical cutoffs based on your true rank and preferences.</p>
            </div>
        </div>
        
        <div class="container">
            <div class="card search-panel" style="max-width: 800px; margin: -5rem auto 4rem auto; background: white; border-radius: 12px; box-shadow: var(--shadow-lg); padding: 2.5rem; position: relative; z-index: 10;">
                <h2 class="mb-4" style="text-align:center; font-size:1.75rem;">Find My Options</h2>
                
                <form id="search-form">
                    <!-- Visually Dominant Input -->
                    <div class="form-group" style="margin-bottom:2rem; background:var(--bg-surface-hover); padding:1.5rem; border-radius:12px; border:2px solid var(--border-color); transition: border-color 0.2s;">
                        <label for="input-rank" class="form-label" style="display:block; margin-bottom:0.75rem; font-weight:600; font-size:1.125rem; color:var(--primary-color);">What is your All India Rank (AIR)?</label>
                        <input type="number" id="input-rank" aria-required="true" class="form-control" style="width:100%; padding:1rem 1.5rem; font-size:1.5rem; font-weight:700; border:1px solid var(--border-color-dark); border-radius:8px; outline:none; transition:box-shadow 0.2s, border-color 0.2s;" required placeholder="e.g. 5000">
                    </div>
                    
                    <div class="grid grid-2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
                        <div class="form-group">
                            <label for="input-cat" class="form-label" style="display:block; margin-bottom:0.5rem; font-weight:500;">Category</label>
                            <select id="input-cat" aria-required="true" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color-dark); border-radius:8px; min-height:44px;" required>
                                <option value="">Select Category</option>
                                ${meta.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="input-course" class="form-label" style="display:block; margin-bottom:0.5rem; font-weight:500;">Branch / Course (Optional)</label>
                            <select id="input-course" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color-dark); border-radius:8px; min-height:44px;">
                                <option value="">Any Branch</option>
                                ${meta.courses.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    
                    
                    <div class="grid grid-2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
                        <div class="form-group">
                            <label for="input-year" class="form-label" style="display:block; margin-bottom:0.5rem; font-weight:500;">Historical Year</label>
                            <select id="input-year" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color-dark); border-radius:8px; min-height:44px;">
                                <option value="all">All Years</option>
                                <option value="2025">2025</option>
                                <option value="2024">2024</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="input-round" class="form-label" style="display:block; margin-bottom:0.5rem; font-weight:500;">Historical Round</label>
                            <select id="input-round" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color-dark); border-radius:8px; min-height:44px;">
                                <option value="all">All Rounds</option>
                                <option value="1">Round 1</option>
                                <option value="2">Round 2</option>
                                <option value="3">Round 3</option>
                                <option value="4">Round 4</option>
                            </select>
                        </div>
                    </div>
                    
                    <details style="margin-bottom:2rem;">
                        <summary style="cursor:pointer; font-weight:600; color:var(--primary-color); outline:none; padding:0.5rem 0; border-bottom:1px solid var(--border-color);">Advanced Filters (Budget, Stipend, Bond)</summary>
                        <div style="padding-top:1.5rem;">
                            <div class="grid grid-2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
                                <div class="form-group">
                                    <label for="input-inst" class="form-label" style="display:block; margin-bottom:0.5rem; font-weight:500;">Specific College</label>
                                    <select id="input-inst" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color-dark); border-radius:8px; min-height:44px;">
                                        <option value="">Any College</option>
                                        ${meta.institutes.map(i => `<option value="${i.id}">${i.name}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="input-budget" class="form-label text-muted" style="display:block; margin-bottom:0.5rem; font-size:0.875rem;">Max Budget (Fee)</label>
                                    <select id="input-budget" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px; min-height:44px;">
                                        <option value="">No Preference</option>
                                        <option value="500000">< ₹5 Lakhs/yr</option>
                                        <option value="1500000">< ₹15 Lakhs/yr</option>
                                        <option value="3000000">< ₹30 Lakhs/yr</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="grid grid-2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
                                <div class="form-group">
                                    <label for="input-stipend" class="form-label text-muted" style="display:block; margin-bottom:0.5rem; font-size:0.875rem;">Min Stipend</label>
                                    <select id="input-stipend" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px; min-height:44px;">
                                        <option value="">No Preference</option>
                                        <option value="30000">> ₹30k / month</option>
                                        <option value="50000">> ₹50k / month</option>
                                        <option value="80000">> ₹80k / month</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="input-bond" class="form-label text-muted" style="display:block; margin-bottom:0.5rem; font-size:0.875rem;">Service Bond</label>
                                    <select id="input-bond" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px; min-height:44px;">
                                        <option value="">No Preference</option>
                                        <option value="no_bond">No Bond Strictly</option>
                                        <option value="max_yrs_1">Max 1 Year</option>
                                        <option value="max_yrs_2">Max 2 Years</option>
                                        <option value="max_pen_1000000">Max Penalty ₹10L</option>
                                        <option value="max_pen_3000000">Max Penalty ₹30L</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="grid grid-2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                                <div class="form-group">
                                    <label class="form-label text-muted" style="display:block; margin-bottom:0.5rem; font-size:0.875rem;">Seats / Matrix</label>
                                    <select class="form-control" aria-disabled="true" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px; opacity:0.5;" disabled title="Data source unavailable">
                                        <option>Data Unavailable</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label text-muted" style="display:block; margin-bottom:0.5rem; font-size:0.875rem;">Domicile</label>
                                    <select class="form-control" aria-disabled="true" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:8px; opacity:0.5;" disabled title="Data source unavailable">
                                        <option>Data Unavailable</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </details>
                    
                    <button type="submit" class="btn btn-primary" style="width:100%; padding:1rem; font-size:1.125rem; font-weight:600; border-radius:8px; border:none; background:var(--primary-color); color:white; cursor:pointer; box-shadow:0 4px 6px rgba(37,99,235,0.2); transition: transform 0.1s, box-shadow 0.1s;"
                        onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 12px rgba(37,99,235,0.3)';" 
                        onmouseout="this.style.transform='none'; this.style.boxShadow='0 4px 6px rgba(37,99,235,0.2)';">
                        Search Options
                    </button>
                </form>
                
                <div class="trust-indicators" style="display:flex; justify-content:center; gap:2rem; flex-wrap:wrap; margin-top:2rem; padding-top:2rem; border-top:1px solid var(--border-color); font-size:0.875rem; color:var(--text-muted);">
                    <div style="display:flex; align-items:center; gap:0.25rem;"><span style="color:var(--success)">✓</span> Historical cutoff data</div>
                    <div style="display:flex; align-items:center; gap:0.25rem;"><span style="color:var(--success)">✓</span> Fee/Stipend/Bond verified</div>
                    <div style="display:flex; align-items:center; gap:0.25rem;"><span style="color:var(--success)">✓</span> Transparent Methodology</div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('search-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const rank = document.getElementById('input-rank').value;
        const cat = document.getElementById('input-cat').value;
        const course = document.getElementById('input-course').value;
        const inst = document.getElementById('input-inst').value;
        const budget = document.getElementById('input-budget').value;
        const stipend = document.getElementById('input-stipend').value;
        const bond = document.getElementById('input-bond').value;
        const year = document.getElementById('input-year').value;
        const round = document.getElementById('input-round').value;
        
        // Validation: AIR is a positive integer
        const rankNum = parseInt(rank, 10);
        if (isNaN(rankNum) || rankNum <= 0) {
            alert('Please enter a valid positive integer for All India Rank.');
            return;
        }
        
        const searchParams = { rank, cat };
        if (course) searchParams.course = course;
        if (inst) searchParams.inst = inst;
        if (budget) searchParams.budget = budget;
        if (stipend) searchParams.stipend = stipend;
        if (bond) searchParams.bond = bond;
        if (year && year !== 'all') searchParams.year = year;
        if (round && round !== 'all') searchParams.round = round;
        
        navigate('/results', searchParams);
    });
}
