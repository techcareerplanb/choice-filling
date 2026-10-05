const fs = require('fs');

// results.js
let results = fs.readFileSync('js/ui/views/results.js', 'utf8');

results = results.replace(/const latestCutoffText = analyzed && analyzed\.latestYear.*?;/s, (match) => {
    return match + "\n            const aiRankText = analyzed && analyzed.latestAIRank ? ` (AIR: ${analyzed.latestAIRank.toLocaleString()})` : '';";
});

results = results.replace(/\$\{analyzed\.latestClosingRank\.toLocaleString\(\)\}<\/strong>\` : '—';/, "${analyzed.latestClosingRank.toLocaleString()}</strong>${aiRankText}` : '—';");

fs.writeFileSync('js/ui/views/results.js', results);

// shortlist.js
let shortlist = fs.readFileSync('js/ui/views/shortlist.js', 'utf8');
shortlist = shortlist.replace(/const latestCutoffText = analyzed && analyzed\.latestYear.*?;/s, (match) => {
    return match + "\n                    const aiRankText = analyzed && analyzed.latestAIRank ? ` (AIR: ${analyzed.latestAIRank.toLocaleString()})` : '';";
});
shortlist = shortlist.replace(/\$\{analyzed\.latestClosingRank\.toLocaleString\(\)\}\` : '—';/, "${analyzed.latestClosingRank.toLocaleString()}${aiRankText}` : '—';");

fs.writeFileSync('js/ui/views/shortlist.js', shortlist);
