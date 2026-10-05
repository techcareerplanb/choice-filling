const fs = require('fs');
let content = fs.readFileSync('js/ui/components/chart.js', 'utf8');

// Revert user${getRankShortLabel()} to userAIR
content = content.replace(/user\$\{getRankShortLabel\(\)\} /g, 'userAIR ');
content = content.replace(/user\$\{getRankShortLabel\(\)\} >=/g, 'userAIR >=');
content = content.replace(/user\$\{getRankShortLabel\(\)\} <=/g, 'userAIR <=');
content = content.replace(/min\$\{getRankShortLabel\(\)\} /g, 'minAIR ');
content = content.replace(/max\$\{getRankShortLabel\(\)\} /g, 'maxAIR ');

// Also let's check results.js for any broken userAIR
let resContent = fs.readFileSync('js/ui/views/results.js', 'utf8');
resContent = resContent.replace(/user\$\{getRankShortLabel\(\)\} /g, 'userAIR ');
fs.writeFileSync('js/ui/views/results.js', resContent);

// And college.js
let colContent = fs.readFileSync('js/ui/views/college.js', 'utf8');
colContent = colContent.replace(/user\$\{getRankShortLabel\(\)\} /g, 'userAIR ');
fs.writeFileSync('js/ui/views/college.js', colContent);

fs.writeFileSync('js/ui/components/chart.js', content);
console.log("Fixed userAIR replacements");
