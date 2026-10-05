const fs = require('fs');

let results = fs.readFileSync('js/ui/views/results.js', 'utf8');
results = results.replace(/\$\{analyzed\.latestClosingRank\.toLocaleString\(\)\}\` : /g, "${analyzed.latestClosingRank.toLocaleString()}${aiRankText}` : ");
fs.writeFileSync('js/ui/views/results.js', results);
