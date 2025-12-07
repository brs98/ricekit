const fs = require('fs');
const tests = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
const failing = tests.filter(t => !t.passes);

// Get onboarding tests
const onboardingTests = failing.filter(t => t.description.toLowerCase().includes('onboarding'));

console.log('ONBOARDING TESTS:\n');
onboardingTests.forEach((test, idx) => {
  console.log(`Test #${tests.indexOf(test) + 1}: ${test.description}`);
  console.log('Steps:');
  test.steps.forEach(step => console.log(`  ${step}`));
  console.log('');
});
