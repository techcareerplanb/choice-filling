const fs = require('fs');

// results.js
let results = fs.readFileSync('js/ui/views/results.js', 'utf8');
results = results.replace(/const cutoffLabelText = isHistorical \? 'Selected Cutoff' : 'Latest Cutoff';/g, "const cutoffLabelText = isHistorical ? 'Selected Cutoff' : `Latest Cutoff (${getRankShortLabel()})`;");
fs.writeFileSync('js/ui/views/results.js', results);

// shortlist.js
let shortlist = fs.readFileSync('js/ui/views/shortlist.js', 'utf8');
shortlist = shortlist.replace(/Latest Cutoff:/g, "Latest Cutoff (${getRankShortLabel()}):");
fs.writeFileSync('js/ui/views/shortlist.js', shortlist);

// compare.js
let compare = fs.readFileSync('js/ui/views/compare.js', 'utf8');
compare = compare.replace(/>Latest Cutoff<\/td>/g, ">Latest Cutoff (${getRankShortLabel()})</td>");
fs.writeFileSync('js/ui/views/compare.js', compare);

console.log("Replaced Latest Cutoff labels");
