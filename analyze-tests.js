const fs = require('fs');

const tests = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const passing = tests.filter(t => t.passes);
const failing = tests.filter(t => !t.passes);

console.log(`Progress: ${passing.length}/${tests.length} tests passing (${(passing.length/tests.length*100).toFixed(1)}%)`);
console.log(`Remaining: ${failing.length} tests\n`);

console.log('First 5 failing tests:\n');
failing.slice(0, 5).forEach((test, idx) => {
  console.log(`${idx + 1}. [${test.category}] ${test.description}`);
  console.log(`   Steps (first 3):`);
  test.steps.slice(0, 3).forEach(step => {
    console.log(`   - ${step}`);
  });
  console.log('');
});
