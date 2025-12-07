const fs = require('fs');

const tests = JSON.parse(fs.readFileSync('./feature_list.json', 'utf8'));

console.log('FAILING TESTS:\n');
tests.forEach((t, i) => {
  if (!t.passes) {
    console.log(`Test #${i+1}: ${t.description}`);
  }
});

const failCount = tests.filter(t => !t.passes).length;
const passCount = tests.filter(t => t.passes).length;
console.log(`\nSummary: ${passCount}/${tests.length} passing (${failCount} remaining)`);
