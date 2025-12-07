const fs = require('fs');

// Read feature list
const tests = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));

// Find and update test #126
let test126Index = -1;
for (let i = 0; i < tests.length; i++) {
  if (tests[i].description === 'Theme import validates theme structure before installing') {
    test126Index = i;
    break;
  }
}

// Find and update test #127
let test127Index = -1;
for (let i = 0; i < tests.length; i++) {
  if (tests[i].description === 'Theme export includes wallpapers if present') {
    test127Index = i;
    break;
  }
}

if (test126Index === -1 || test127Index === -1) {
  console.error('Tests not found!');
  console.log(`Test #126 index: ${test126Index}`);
  console.log(`Test #127 index: ${test127Index}`);
  process.exit(1);
}

console.log(`Found test #126 at index ${test126Index}`);
console.log(`Description: ${tests[test126Index].description}`);
console.log(`Current status: ${tests[test126Index].passes}`);

console.log(`\nFound test #127 at index ${test127Index}`);
console.log(`Description: ${tests[test127Index].description}`);
console.log(`Current status: ${tests[test127Index].passes}`);

// Update to passing
tests[test126Index].passes = true;
tests[test127Index].passes = true;

// Write back to file
fs.writeFileSync('feature_list.json', JSON.stringify(tests, null, 2));

console.log('\n✓ Updated test #126 to passing');
console.log('✓ Updated test #127 to passing');

// Count progress
const passing = tests.filter(t => t.passes).length;
console.log(`\nProgress: ${passing}/${tests.length} tests passing (${(passing/tests.length*100).toFixed(1)}%)`);
