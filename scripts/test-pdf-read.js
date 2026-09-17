const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/incoming/test-pdf-data.json'));
data.Pages[0].Texts.forEach(t => {
    const text = decodeURIComponent(t.R[0].T);
    if (text.includes('DERM') || text.includes('Seth Gordhandas')) {
        console.log(`x: ${t.x.toFixed(2)}, y: ${t.y.toFixed(2)}, text: ${text}`);
    }
});
