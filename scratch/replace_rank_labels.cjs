const fs = require('fs');

// Create js/ui/utils.js
fs.writeFileSync('js/ui/utils.js', `
export function getRankLabel() {
    const c = localStorage.getItem('activeCounselling') || 'All-India';
    return c === 'All-India' ? 'All India Rank (AIR)' : 'State Rank';
}

export function getRankShortLabel() {
    const c = localStorage.getItem('activeCounselling') || 'All-India';
    return c === 'All-India' ? 'AIR' : 'Rank';
}
`);

function processFile(path, isChart = false) {
    if (!fs.existsSync(path)) return;
    let content = fs.readFileSync(path, 'utf8');
    
    // Add import
    const importPath = isChart ? '../utils.js' : '../utils.js';
    if (!content.includes('getRankLabel')) {
        content = `import { getRankLabel, getRankShortLabel } from '${importPath}';\n` + content;
    }
    
    // Replace text
    // "All India Rank (AIR)" -> ${getRankLabel()}
    content = content.replace(/All India Rank \(AIR\)/g, '${getRankLabel()}');
    // "All India Rank" -> ${getRankLabel()}
    content = content.replace(/All India Rank/g, '${getRankLabel()}');
    // "AIR " -> "${getRankShortLabel()} "
    content = content.replace(/AIR /g, '${getRankShortLabel()} ');
    content = content.replace(/>AIR</g, '>${getRankShortLabel()}<');
    content = content.replace(/Your AIR/g, 'Your ${getRankShortLabel()}');
    
    fs.writeFileSync(path, content);
}

processFile('js/ui/views/results.js');
processFile('js/ui/views/college.js');
processFile('js/ui/views/static.js');
processFile('js/ui/views/compare.js');
processFile('js/ui/views/shortlist.js');
processFile('js/ui/views/choicelist.js');
processFile('js/ui/components/chart.js', true);

console.log("Replaced rank labels");
