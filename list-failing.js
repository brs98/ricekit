const fs = require('fs');
const data = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
data.forEach((test, index) => {
  if (!test.passes) {
    console.log(`Test #${index + 1}: ${test.description}`);
    console.log('Steps:');
    test.steps.forEach(step => console.log('  ' + step));
    console.log('');
  }
});
