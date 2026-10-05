const fs = require('fs');

function fixFile(path) {
    let content = fs.readFileSync(path, 'utf8');
    
    // Find aiRankText declaration
    const aiRankRegex = /^\s*const aiRankText = analyzed && analyzed\.latestAIRank \? \` \(AIR: \$\{analyzed\.latestAIRank\.toLocaleString\(\)\}\)\` : '';\r?\n?/m;
    const match = content.match(aiRankRegex);
    
    if (match) {
        // Remove it from its current position
        content = content.replace(aiRankRegex, '');
        // Place it right before `const latestCutoffText`
        content = content.replace(/const latestCutoffText =/g, match[0].trim() + '\n            const latestCutoffText =');
        fs.writeFileSync(path, content);
        console.log(`Fixed ${path}`);
    } else {
        console.log(`Could not find aiRankText in ${path}`);
    }
}

fixFile('js/ui/views/results.js');
fixFile('js/ui/views/shortlist.js');

