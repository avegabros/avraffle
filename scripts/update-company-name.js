const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'web/src/app/page.tsx',
  'web/src/app/layout.tsx',
  'web/src/app/privacy/page.tsx',
  'web/src/app/terms/page.tsx',
  'README.md',
  'scripts/generate-feature-graphic.js'
];

for (const relPath of filesToUpdate) {
  const fullPath = path.resolve(relPath);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    const updated = content
      .replace(/Avega Bros Integrated Logistics, Inc\./g, 'Avega Bros Integrated Shipping Corp.')
      .replace(/Avega Bros Integrated Logistics, Inc/g, 'Avega Bros Integrated Shipping Corp')
      .replace(/Avega Bros Integrated Logistics/g, 'Avega Bros Integrated Shipping Corp');
    fs.writeFileSync(fullPath, updated, 'utf8');
    console.log(`Updated company name in: ${relPath}`);
  }
}
