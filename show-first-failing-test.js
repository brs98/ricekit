const fs = require('fs');
const tests = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const test = tests.find(t => !t.passes);
console.log(JSON.stringify(test, null, 2));
