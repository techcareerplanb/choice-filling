import { getRankLabel, getRankShortLabel } from '../utils.js';
export function renderStatic(container, path) {
    if (path === '/methodology') {
        container.innerHTML = `
            <div class="container" style="max-width:800px; margin-top:2rem; background:var(--bg-surface); padding:3rem; border-radius:8px; box-shadow:var(--shadow-sm);">
                <h1 class="mb-4">Data & Methodology</h1>
                
                <h3 class="mt-4 mb-2">Data Sources</h3>
                <p class="text-muted">The core dataset is derived from the official Medical Counseling Committee (MCC) allotments. It has been rigorously processed to separate available historical allotments from unavailable or ambiguous entries.</p>
                
                <h3 class="mt-4 mb-2">Cutoff Logic & Fit Assessment</h3>
                <p class="text-muted">Unlike traditional portals that provide a single arbitrary probability score, our engine compares your ${getRankLabel()} directly against historical closing ranks across multiple rounds. A "Safe/Realistic" label is applied if your rank falls safely within the historical boundaries (plus a small buffer margin to account for year-over-year variance). An "Ambitious" label is applied if your rank is worse than historical cutoffs.</p>
                
                <h3 class="mt-4 mb-2">Financial Asterisks</h3>
                <p class="text-muted">You will often see a yellow warning triangle (⚠️) next to fees and stipends. This preserves the original caveat from the authorities (e.g. "₹69,470*"), indicating the amount may be subject to court orders or specific state conditions.</p>
            </div>
        `;
    } else if (path === '/help') {
        container.innerHTML = `
            <div class="container" style="max-width:800px; margin-top:2rem; background:var(--bg-surface); padding:3rem; border-radius:8px; box-shadow:var(--shadow-sm);">
                <h1 class="mb-4">Help & Definitions</h1>
                
                <h3 class="mt-4 mb-2">What is the Shortlist?</h3>
                <p class="text-muted">The shortlist is your personal pool of interesting opportunities. Adding an item to the shortlist does not rank it; it simply saves it so you don't have to search for it again.</p>
                
                <h3 class="mt-4 mb-2">What is the Choice List?</h3>
                <p class="text-muted">The choice list is a strictly ordered list. When official counselling begins, you must submit your preferences in order. You build your Choice List by dragging and dropping items from your Shortlist.</p>
                
                <h3 class="mt-4 mb-2">Why are some Seat Counts missing?</h3>
                <p class="text-muted">We strictly distinguish between "Hospital Beds" and actual "Course Seats". If the official seat matrix is not yet published for a given round, we show "Data Unavailable" rather than fabricating a guess.</p>
            </div>
        `;
    }
}
