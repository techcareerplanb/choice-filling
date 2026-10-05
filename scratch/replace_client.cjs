const fs = require('fs');
const p = 'js/engine/client.js';
let content = fs.readFileSync(p, 'utf8');

// Add a helper to get prefix
const prefixHelper = `
function getApiPrefix() {
    const c = localStorage.getItem('activeCounselling') || 'All-India';
    return \`/api/\${c}\`;
}
`;

content = content.replace("export class EngineClient", prefixHelper + "\nexport class EngineClient");

content = content.replace("await fetch('/api/filter-metadata');", "await fetch(getApiPrefix() + '/api/filter-metadata'.replace('/api', ''));");
content = content.replace("await fetch(\`/api/options?\${params.toString()}\`);", "await fetch(\`\${getApiPrefix()}/options?\${params.toString()}\`);");
content = content.replace("await fetch(\`/api/options/\${id}?\${params.toString()}\`);", "await fetch(\`\${getApiPrefix()}/options/\${id}?\${params.toString()}\`);");
content = content.replace("await fetch(\`/api/identities?\${params.toString()}\`);", "await fetch(\`\${getApiPrefix()}/identities?\${params.toString()}\`);");

// Fix cache keys to incorporate counselling
content = content.replace(/const cacheKey = JSON\.stringify\(sortedParams\);/g, "const cacheKey = getApiPrefix() + '_' + JSON.stringify(sortedParams);");
content = content.replace(/const cacheKey = \`\$\{id\}_\$\{JSON\.stringify\(sortedParams\)\}\`;/g, "const cacheKey = getApiPrefix() + '_' + \`\${id}_\${JSON.stringify(sortedParams)}\`;");
content = content.replace("await getCacheItem('filterMetadata', 'meta')", "await getCacheItem('filterMetadata', getApiPrefix())");
content = content.replace("await setCacheItem('filterMetadata', 'meta', data)", "await setCacheItem('filterMetadata', getApiPrefix(), data)");

fs.writeFileSync(p, content);
console.log("Replaced client.js");
