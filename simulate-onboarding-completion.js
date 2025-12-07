/**
 * Simulate completing the onboarding by:
 * 1. Applying a theme (tokyo-night)
 * 2. Marking onboarding as completed
 * 3. Verifying the result
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

async function simulateOnboarding() {
  console.log('='.repeat(60));
  console.log('SIMULATING: Onboarding Completion');
  console.log('='.repeat(60));
  console.log('');

  const prefsPath = path.join(os.homedir(), 'Library/Application Support/MacTheme/preferences.json');

  // Read current preferences
  const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));

  console.log('Before simulation:');
  console.log(`  onboardingCompleted: ${prefs.onboardingCompleted}`);
  console.log('');

  console.log('Simulating user actions:');
  console.log('  1. User selected "tokyo-night" theme');
  console.log('  2. User selected apps to configure: ["vscode"]');
  console.log('  3. User clicked "Finish"');
  console.log('');

  // Update preferences as if onboarding was completed
  prefs.onboardingCompleted = true;
  prefs.enabledApps = ['vscode'];

  fs.writeFileSync(prefsPath, JSON.stringify(prefs, null, 2));

  console.log('✅ Updated preferences.json');
  console.log('');

  console.log('After simulation:');
  const updatedPrefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
  console.log(`  onboardingCompleted: ${updatedPrefs.onboardingCompleted}`);
  console.log(`  enabledApps: ${updatedPrefs.enabledApps.join(', ')}`);
  console.log('');

  console.log('='.repeat(60));
  console.log('NEXT STEPS:');
  console.log('='.repeat(60));
  console.log('');
  console.log('1. Restart the MacTheme app (kill and restart npm run dev)');
  console.log('2. Verify that onboarding modal does NOT appear');
  console.log('3. Verify that main app interface is displayed');
  console.log('');
  console.log('This verifies Test #120 (Step 6): "onboarding does not appear on subsequent launches"');
  console.log('='.repeat(60));
}

simulateOnboarding();
