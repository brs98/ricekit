const fs = require('fs');
const features = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));

let count = 0;
for (let i = 0; i < features.length && count < 10; i++) {
  if (!features[i].passes) {
    console.log(`Test #${i + 1}: ${features[i].description}`);
    count++;
  }
}
