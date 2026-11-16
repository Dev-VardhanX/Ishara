const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) results.push(...walk(full));
    else if (full.endsWith('.tsx') || full.endsWith('.ts')) results.push(full);
  }
  return results;
}

const files = walk('web/src');
const routeMap = {};

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const matches = content.matchAll(/(?:to=['"]|navigate\(['"]|href=['"])([^'"#?]+)['"]/g);
  for (const m of matches) {
    if (m[1].startsWith('/')) {
      const r = m[1];
      if (!routeMap[r]) routeMap[r] = [];
      routeMap[r].push(file);
    }
  }
}

console.log(JSON.stringify(routeMap, null, 2));
