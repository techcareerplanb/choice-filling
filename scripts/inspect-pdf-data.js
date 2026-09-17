const fs = require('fs');

const data = JSON.parse(fs.readFileSync('data/incoming/test-pdf-data.json'));

let extractedRows = [];

data.Pages.forEach((page, pageNum) => {
    // Find Quota texts (baseline indicators)
    const quotaTexts = page.Texts.filter(t => {
        const text = decodeURIComponent(t.R[0].T).trim();
        return t.x > 30 && t.x < 33 && text.length > 2 && text !== "Quota";
    });
    
    const baselines = quotaTexts.map(t => t.y).sort((a, b) => a - b);
    if (baselines.length === 0) return;
    
    // Find header Y to separate header from first row
    const headerTexts = page.Texts.filter(t => decodeURIComponent(t.R[0].T).trim() === "Institute Type");
    const headerY = headerTexts.length > 0 ? headerTexts[0].y : 0;
    
    for (let i = 0; i < baselines.length; i++) {
        let yBase = baselines[i];
        let minY = i === 0 ? (headerY > 0 ? (headerY + yBase) / 2 : yBase - 1.0) : (baselines[i-1] + yBase) / 2;
        let maxY = i === baselines.length - 1 ? yBase + 1.5 : (yBase + baselines[i+1]) / 2;
        
        let rowTexts = page.Texts.filter(t => t.y > minY && t.y < maxY);
        
        let instTypeArr = [];
        let instArr = [];
        let progArr = [];
        let numbers = [];
        let quotaStr = "";
        
        rowTexts.sort((a, b) => a.y - b.y || a.x - b.x).forEach(t => {
            let text = decodeURIComponent(t.R[0].T).trim();
            if (!text) return;
            
            if (t.x < 7.5) {
                instTypeArr.push(text);
            } else if (t.x >= 7.5 && t.x < 22) {
                instArr.push(text);
            } else if (t.x >= 22 && t.x < 30) {
                progArr.push(text);
            } else if (t.x >= 30 && t.x < 33) {
                quotaStr += (quotaStr ? " " : "") + text;
            } else if (t.x >= 33) {
                numbers.push({ x: t.x, val: text });
            }
        });
        
        numbers.sort((a, b) => a.x - b.x);
        
        extractedRows.push({
            page: pageNum + 1,
            instituteType: instTypeArr.join(" "),
            institute: instArr.join(" "),
            program: progArr.join(" "),
            quota: quotaStr,
            seats: numbers.map(n => n.val)
        });
    }
});

fs.writeFileSync('data/incoming/test-extracted.json', JSON.stringify(extractedRows, null, 2));
console.log(`Extracted ${extractedRows.length} rows.`);
