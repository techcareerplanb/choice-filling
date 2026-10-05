const fs = require('fs');

// 1. results.js
let results = fs.readFileSync('js/ui/views/results.js', 'utf8');

// Modify the sidebar HTML to include AIR input conditionally
const airInputHtml = `
\${getRankLabel() !== 'All India Rank (AIR)' ? \`
<div style="margin-bottom:1.5rem;">
    <label class="form-label" style="display:block; margin-bottom:0.5rem; font-weight:500;">All India Rank (AIR)</label>
    <input type="text" inputmode="numeric" pattern="[0-9]*" id="sidebar-ai-rank" class="form-control" style="width:100%; padding:0.75rem; border:1px solid var(--border-color-dark); border-radius:8px;" value="\${params.aiRank || ''}" placeholder="e.g. 5000">
</div>
\` : ''}
`;

results = results.replace(/<div style="margin-bottom:1.5rem;">\s*<label class="form-label".*?\$\{getRankLabel\(\)\}<\/label>[\s\S]*?<\/div>/, (match) => {
    return match + airInputHtml;
});

// Add parsing of aiRank
results = results.replace(/const rank = params\.rank \? parseInt\(params\.rank, 10\) : null;/, "const rank = params.rank ? parseInt(params.rank, 10) : null;\n    const aiRank = params.aiRank ? parseInt(params.aiRank, 10) : null;");
// Pass aiRank to engine search
results = results.replace(/const pageData = await engine\.search\(rank, criteria, params\.cursor, params\.sortBy, isForced\);/, "const pageData = await engine.search({rank, aiRank}, criteria, params.cursor, params.sortBy, isForced);");
results = results.replace(/criteria\.rank = document\.getElementById\('sidebar-rank'\)\.value\.trim\(\);/, "criteria.rank = document.getElementById('sidebar-rank').value.trim();\n        const aiRankEl = document.getElementById('sidebar-ai-rank');\n        if (aiRankEl) criteria.aiRank = aiRankEl.value.trim();");

// Update URL params
results = results.replace(/if \(criteria\.rank\) newParams\.rank = criteria\.rank;/, "if (criteria.rank) newParams.rank = criteria.rank;\n        if (criteria.aiRank) newParams.aiRank = criteria.aiRank;");

fs.writeFileSync('js/ui/views/results.js', results);

// 2. client.js
let client = fs.readFileSync('js/engine/client.js', 'utf8');
client = client.replace(/async search\(rank, criteria, cursor = null, sortBy = 'fit', forceRefresh = false\) {/, "async search(ranks, criteria, cursor = null, sortBy = 'fit', forceRefresh = false) {\n        const rank = ranks.rank;\n        const aiRank = ranks.aiRank;");
client = client.replace(/if \(rank\) params\.append\('rank', rank\);/, "if (rank) params.append('rank', rank);\n        if (aiRank) params.append('aiRank', aiRank);");
fs.writeFileSync('js/engine/client.js', client);

// 3. data.js
let data = fs.readFileSync('server/data.js', 'utf8');
data = data.replace(/const rank = query\.rank \? parseInt\(query\.rank, 10\) : null;/, "const rank = query.rank ? parseInt(query.rank, 10) : null;\n    const aiRank = query.aiRank ? parseInt(query.aiRank, 10) : null;");
data = data.replace(/hydrated\._fit = assessFit\(rank, analyzed\);/, "hydrated._fit = assessFit(rank, aiRank, analyzed);");
fs.writeFileSync('server/data.js', data);

// 4. fitEngine.js
let fit = fs.readFileSync('js/engine/fitEngine.js', 'utf8');
fit = fit.replace(/export function assessFit\(userAIR, analyzedCutoffs\) {/, "export function assessFit(userRank, userAIR, analyzedCutoffs) {");

// Now update fitEngine to use either userRank or userAIR
// We'll prefer userRank against closingRank, or userAIR against latestAIRank
const fitLogic = `
    let rankMarginLatest = null;
    let rankMarginBest = null;
    let rankMarginWorst = null;
    let usedAIR = false;

    if (userRank) {
        rankMarginLatest = calculateRankMargin(userRank, analyzedCutoffs.latestClosingRank);
        rankMarginBest = calculateRankMargin(userRank, analyzedCutoffs.bestClosingRank);     
        rankMarginWorst = calculateRankMargin(userRank, analyzedCutoffs.worstClosingRank); 
    } else if (userAIR && analyzedCutoffs.latestAIRank) {
        rankMarginLatest = calculateRankMargin(userAIR, analyzedCutoffs.latestAIRank);
        // We only have latestAIRank in analyzedCutoffs right now, so best/worst might be null for AIR
        rankMarginBest = rankMarginLatest;
        rankMarginWorst = rankMarginLatest;
        usedAIR = true;
    }
`;

fit = fit.replace(/const rankMarginLatest = calculateRankMargin\(userAIR, analyzedCutoffs\.latestClosingRank\);\s*const rankMarginBest = calculateRankMargin\(userAIR, analyzedCutoffs\.bestClosingRank\);\s*const rankMarginWorst = calculateRankMargin\(userAIR, analyzedCutoffs\.worstClosingRank\);/m, fitLogic);

// Replace UserAIR references in explanation
fit = fit.replace(/const userRankNum = Number\(String\(userAIR\)\.replace\(\/\[\^0-9\.\-\]\+\/g, ""\)\);/, "const userRankNum = Number(String(usedAIR ? userAIR : userRank).replace(/[^0-9.-]+/g, ''));");
fit = fit.replace(/Your AIR is \$\{userRankNum\.toLocaleString\(\)\}\./, "Your ${usedAIR ? 'AIR' : 'Rank'} is ${userRankNum.toLocaleString()}.");

fs.writeFileSync('js/engine/fitEngine.js', fit);

console.log("Added AIR support");
