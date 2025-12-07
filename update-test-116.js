const fs = require('fs');
const featureList = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));

// Find test #116
let testIndex = featureList.findIndex(t => t.description.includes('Large number of custom themes'));

if (testIndex !== -1) {
  featureList[testIndex].passes = true;
  fs.writeFileSync('feature_list.json', JSON.stringify(featureList, null, 2));
  console.log('✅ Updated Test #116 to passes: true');
  console.log('Test:', featureList[testIndex].description);
  console.log('Test number:', testIndex + 1);
} else {
  console.log('❌ Test #116 not found');
}
