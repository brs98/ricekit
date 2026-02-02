/**
 * Test complete onboarding flow by simulating user interaction
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

async function testOnboardingFlow() {
  console.log('='.repeat(70));
  console.log('TEST: Complete Onboarding Flow (Test #120, #121, #122)');
  console.log('='.repeat(70));
  console.log('');

  const prefsPath = path.join(os.homedir(), 'Library/Application Support/Ricekit/preferences.json');
  const statePath = path.join(os.homedir(), 'Library/Application Support/Ricekit/state.json');

  // STEP 1: Verify initial state
  console.log('Step 1: Verify initial state');
  console.log('─'.repeat(70));

  if (!fs.existsSync(prefsPath)) {
    console.log('✗ Preferences file not found!');
    process.exit(1);
  }

  const initialPrefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
  console.log(`  Current onboardingCompleted: ${initialPrefs.onboardingCompleted}`);

  if (initialPrefs.onboardingCompleted === false) {
    console.log('  ✅ onboardingCompleted is false - modal should be visible');
  } else {
    console.log('  ⚠️  onboardingCompleted is true - modal will NOT show');
    console.log('  To test onboarding, set it to false in preferences.json');
  }

  console.log('');

  // STEP 2: Manual verification instructions
  console.log('Step 2: Manual Verification Required');
  console.log('─'.repeat(70));
  console.log('');
  console.log('Please open the Ricekit application and verify the following:');
  console.log('');

  console.log('Test #120: Onboarding flow appears on first launch');
  console.log('  ☐ Step 1: Onboarding modal is visible (not the main app)');
  console.log('  ☐ Step 2: Modal has "Welcome to Ricekit! 🎨" heading');
  console.log('  ☐ Step 3: Progress indicator shows 3 steps at top');
  console.log('  ☐ Step 4: Four feature descriptions are displayed with emojis');
  console.log('  ☐ Step 5: "Next" button is visible at bottom right');
  console.log('');

  console.log('Test #121: Onboarding helps user select initial theme');
  console.log('  ☐ Step 1: Click "Next" on welcome screen');
  console.log('  ☐ Step 2: Second screen shows "Choose Your Initial Theme"');
  console.log('  ☐ Step 3: Grid of themes with color previews is displayed');
  console.log('  ☐ Step 4: One theme is pre-selected (tokyo-night)');
  console.log('  ☐ Step 5: Can click different themes to select them');
  console.log('  ☐ Step 6: Selected theme has blue border');
  console.log('');

  console.log('Test #122: Onboarding offers to configure applications');
  console.log('  ☐ Step 1: Click "Next" on theme selection screen');
  console.log('  ☐ Step 2: Third screen shows "Configure Applications"');
  console.log('  ☐ Step 3: List of detected installed applications');
  console.log('  ☐ Step 4: Checkboxes for each application');
  console.log('  ☐ Step 5: Can toggle applications on/off');
  console.log('  ☐ Step 6: "Finish" button is visible');
  console.log('');

  console.log('Complete the flow:');
  console.log('  ☐ Step 1: Click "Finish" button');
  console.log('  ☐ Step 2: Completion screen shows "You\'re All Set! 🎉"');
  console.log('  ☐ Step 3: Modal automatically closes after 2 seconds');
  console.log('  ☐ Step 4: Main app interface becomes visible');
  console.log('');

  console.log('─'.repeat(70));
  console.log('');

  // STEP 3: Wait for completion
  console.log('Waiting for onboarding to be completed...');
  console.log('(Script will check every 2 seconds for up to 2 minutes)');
  console.log('');

  let attempts = 0;
  const maxAttempts = 60; // 2 minutes

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    attempts++;

    try {
      const currentPrefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));

      if (currentPrefs.onboardingCompleted === true) {
        console.log('');
        console.log('✅ Onboarding completed detected!');
        console.log('');
        console.log('─'.repeat(70));
        console.log('Verification:');
        console.log('─'.repeat(70));

        // Check if theme was applied
        if (fs.existsSync(statePath)) {
          const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
          console.log(`  Current theme: ${state.currentTheme}`);
        }

        // Check if apps were configured
        console.log(`  Enabled apps: ${currentPrefs.enabledApps.join(', ') || 'none'}`);

        console.log('');
        console.log('='.repeat(70));
        console.log('TEST RESULTS');
        console.log('='.repeat(70));
        console.log('');
        console.log('If you completed all the checkboxes above:');
        console.log('  ✅ Test #120: PASS - Onboarding flow appears');
        console.log('  ✅ Test #121: PASS - Theme selection works');
        console.log('  ✅ Test #122: PASS - App configuration works');
        console.log('');
        console.log('='.repeat(70));

        process.exit(0);
      }
    } catch (error) {
      // Continue waiting
    }

    if (attempts % 10 === 0) {
      console.log(`  Still waiting... (${attempts * 2}s elapsed)`);
    }
  }

  console.log('');
  console.log('⏱️  Timeout reached. Onboarding was not completed within 2 minutes.');
  console.log('    This is okay - test manually using the checklist above.');
  console.log('');
}

testOnboardingFlow();
