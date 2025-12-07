const fs = require('fs');
const features = JSON.parse(fs.readFileSync('./feature_list.json', 'utf8'));

const testNumbers = [142, 143, 144, 145, 146, 147];
console.log('Tests #142-147 Details:\n');

testNumbers.forEach(testNum => {
  const test = features[testNum - 1];
  if (!test) {
    console.log(`Test #${testNum}: NOT FOUND\n`);
    return;
  }
  console.log(`Test #${testNum}: ${test.description}`);
  console.log(`Status: ${test.passes ? '✅ PASSING' : '❌ FAILING'}`);
  console.log(`Category: ${test.category}`);
  console.log('Steps:');
  test.steps.forEach((step, i) => {
    console.log(`  ${i + 1}. ${step}`);
  });
  console.log('');
});
