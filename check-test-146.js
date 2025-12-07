const fs = require('fs');
const features = JSON.parse(fs.readFileSync('./feature_list.json', 'utf8'));
const test = features[145]; // Test #146
console.log(`Test #${146}: ${test.description}\n`);
console.log('Steps:');
test.steps.forEach((step, i) => {
  console.log(`  ${i + 1}. ${step}`);
});
