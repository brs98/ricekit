const fs = require('fs');

const data = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));

// Find Test #125 (URL-based theme import)
const idx = data.findIndex(f =>
  f.description.includes('URL-based theme import')
);

if (idx === -1) {
  console.error('Test not found!');
  process.exit(1);
}

console.log(`Found Test #${idx + 1}: ${data[idx].description}`);
console.log(`Currently passes: ${data[idx].passes}`);

// Update to passing
data[idx].passes = true;

// Write back to file
fs.writeFileSync('feature_list.json', JSON.stringify(data, null, 2));

console.log('\n✅ Updated Test #125 to passing!');

// Count passing tests
const passing = data.filter(f => f.passes).length;
const total = data.length;
console.log(`\nProgress: ${passing}/${total} tests passing (${(passing/total*100).toFixed(1)}%)`);
