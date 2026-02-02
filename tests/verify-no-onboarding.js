/**
 * Verify that onboarding does NOT appear when onboardingCompleted = true
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('='.repeat(60));
console.log('TEST: Verify Onboarding Does Not Appear on Restart');
console.log('='.repeat(60));
console.log('');

const prefsPath = path.join(os.homedir(), 'Library/Application Support/Ricekit/preferences.json');
const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));

console.log('Current state:');
console.log(`  onboardingCompleted: ${prefs.onboardingCompleted}`);
console.log('');

if (prefs.onboardingCompleted === true) {
  console.log('✅ onboardingCompleted is true');
  console.log('');
  console.log('Expected behavior:');
  console.log('  - Onboarding modal should NOT be displayed');
  console.log('  - Main app interface should be visible immediately');
  console.log('  - User should see the Themes view with the theme grid');
  console.log('');
  console.log('='.repeat(60));
  console.log('VERIFICATION CHECKLIST (Test #120, Step 6):');
  console.log('='.repeat(60));
  console.log('');
  console.log('Open the Ricekit app and verify:');
  console.log('  ☐ Onboarding modal is NOT visible');
  console.log('  ☐ Main app sidebar is visible (Themes, Editor, Apps, etc.)');
  console.log('  ☐ Theme grid is displayed in the main content area');
  console.log('  ☐ No "Welcome to Ricekit" modal overlaying the interface');
  console.log('');
  console.log('If all checkboxes are true:');
  console.log('  ✅ Test #120 Step 6 PASSES');
  console.log('  ✅ Onboarding correctly does not appear on subsequent launches');
  console.log('');
} else {
  console.log('⚠️  onboardingCompleted is false');
  console.log('    Onboarding will still appear. Run simulate-onboarding-completion.js first.');
  console.log('');
}

console.log('='.repeat(60));
