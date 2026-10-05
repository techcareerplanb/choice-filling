const fs = require('fs');
const p = 'server.js';
let content = fs.readFileSync(p, 'utf8');

// Find the block of app.get('/api/counsellings' ...);
const routeRegex = /app\.get\('\/api\/counsellings', \(req, res\) => \{[\s\S]*?\}\);\n/m;
const match = content.match(routeRegex);

if (match) {
    content = content.replace(routeRegex, '');
    // Insert it after `app.use(compression());`
    content = content.replace('app.use(compression());', 'app.use(compression());\n' + match[0]);
    fs.writeFileSync(p, content);
    console.log("Fixed app.get placement");
} else {
    console.log("Could not find the route to move");
}
