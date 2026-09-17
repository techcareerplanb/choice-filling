const fs = require('fs');
const path = require('path');

const coursesPath = path.join(__dirname, '../data/processed/courses.json');
const courses = JSON.parse(fs.readFileSync(coursesPath, 'utf8'));

const courseMap = new Map();
courses.forEach(c => courseMap.set(c.id, c.name.toLowerCase()));

function findBestCourse(mccProg) {
    let cleanProg = mccProg.replace(/\([0-9a-zA-Z]+\)/g, '').toLowerCase();
    const tokens = cleanProg.split(/[^a-z0-9]+/).filter(t => t.length > 2);
    let bestMatch = null;
    let maxScore = 0;
    
    for (let [cId, cName] of courseMap.entries()) {
        const cTokens = cName.split(/[^a-z0-9]+/).filter(t => t.length > 2);
        let overlap = 0;
        for (let t of tokens) if (cTokens.includes(t)) overlap++;
        let score = overlap / Math.max(tokens.length, cTokens.length);
        if (score > maxScore) { maxScore = score; bestMatch = cId; }
    }
    console.log(`Prog: ${mccProg} -> Tokens: [${tokens}] -> Best Match ID: ${bestMatch} Score: ${maxScore}`);
    return maxScore >= 0.4 ? bestMatch : null;
}

findBestCourse("M.D. (ANAESTHESIOLOGY)");
findBestCourse("M.D. (GENERAL MEDICINE)");
