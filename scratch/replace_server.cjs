const fs = require('fs');
const p = 'server.js';
let content = fs.readFileSync(p, 'utf8');

// Replace standard api endpoints with /api/:counselling/...
content = content.replace(/app\.get\('\/api\/search'/g, 'app.get(\'/api/:counselling/search\'');
content = content.replace(/app\.get\('\/api\/options'/g, 'app.get(\'/api/:counselling/options\'');
content = content.replace(/app\.get\('\/api\/options\/:id'/g, 'app.get(\'/api/:counselling/options/:id\'');
content = content.replace(/app\.get\('\/api\/filter-metadata'/g, 'app.get(\'/api/:counselling/filter-metadata\'');
content = content.replace(/app\.get\('\/api\/identities'/g, 'app.get(\'/api/:counselling/identities\'');

// Now, inside these route handlers, pass req.params.counselling to the functions.
content = content.replace(/const results = searchOptions\(req\.query\);/g, 'const results = searchOptions(req.params.counselling, req.query);');
content = content.replace(/const option = getOption\(req\.params\.id\);/g, 'const option = getOption(req.params.counselling, req.params.id);');
content = content.replace(/const options = getOptionsBatch\(ids\);/g, 'const options = getOptionsBatch(req.params.counselling, ids);');
content = content.replace(/const meta = getFilterMetadata\(\);/g, 'const meta = getFilterMetadata(req.params.counselling);');
content = content.replace(/const identities = getFilteredIdentities\(req\.query\);/g, 'const identities = getFilteredIdentities(req.params.counselling, req.query);');

// Add a route to list counsellings
const listRoute = `
app.get('/api/counsellings', (req, res) => {
    const fs = require('fs');
    const path = require('path');
    const dirs = fs.readdirSync(path.join(__dirname, 'data/processed'), { withFileTypes: true });
    const counsellings = dirs.filter(d => d.isDirectory() && !d.name.includes('mcc_pg')).map(d => d.name);
    res.json({ success: true, counsellings });
});
`;

content = content.replace(/\/\/ ---------------------------------------------------------------------------/, listRoute + '\n// ---------------------------------------------------------------------------');

fs.writeFileSync(p, content);
console.log("Replaced server.js");
