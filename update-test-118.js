const fs = require('fs');

// Read feature list
const tests = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));

// Find test #118 (Memory usage remains stable)
let testIndex = -1;
for (let i = 0; i < tests.length; i++) {
  if (tests[i].description === 'Memory usage remains stable after multiple theme switches') {
    testIndex = i;
    break;
  }
}

if (testIndex === -1) {
  console.error('Test #118 not found!');
  process.exit(1);
}

console.log(`Found test at index ${testIndex}`);
console.log(`Description: ${tests[testIndex].description}`);
console.log(`Current status: ${tests[testIndex].passes}`);

// Update to passing
tests[testIndex].passes = true;

// Write back to file
fs.writeFileSync('feature_list.json', JSON.stringify(tests, null, 2));

console.log('✓ Updated test #118 to passing');

// Count progress
const passing = tests.filter(t => t.passes).length;
console.log(`\nProgress: ${passing}/${tests.length} tests passing (${(passing/tests.length*100).toFixed(1)}%)`);
