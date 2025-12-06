const fs = require('fs');
const features = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
let found = false;
for (let i = 0; i < features.length; i++) {
  if (!features[i].passes && !found) {
    console.log('Test #' + (i + 1) + ': ' + features[i].description);
    console.log('Category:', features[i].category);
    console.log('\nSteps:');
    features[i].steps.forEach((step, idx) => {
      console.log('  ' + step);
    });
    found = true;
  }
}
