const fs = require('fs');
const features = JSON.parse(fs.readFileSync('./feature_list.json', 'utf8'));
const failing = features.filter(f => !f.passes);
console.log(`Total: ${features.length} tests, ${features.filter(f => f.passes).length} passing, ${failing.length} failing\n`);
console.log('First 5 failing tests:\n');
failing.slice(0, 5).forEach((f, i) => {
  const testNum = features.indexOf(f) + 1;
  console.log(`${i+1}. Test #${testNum}: ${f.description}`);
  console.log(`   Category: ${f.category}`);
  console.log(`   Steps: ${f.steps.length}`);
  console.log('');
});
