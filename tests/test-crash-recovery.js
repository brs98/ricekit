#!/usr/bin/env node

/**
 * Test script for crash recovery functionality (Test #159)
 *
 * This test:
 * 1. Configures application state (changes view, sets filters, etc.)
 * 2. Waits for state to be saved
 * 3. Force quits the application
 * 4. Relaunches the application
 * 5. Verifies that the previous state is restored
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const UI_STATE_PATH = path.join(os.homedir(), 'Library/Application Support/Ricekit/ui-state.json');

console.log('============================================================');
console.log('TEST #159: Crash Recovery Functionality');
console.log('============================================================\n');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForApp() {
  console.log('Waiting for app to start...');
  for (let i = 0; i < 30; i++) {
    try {
      const result = execSync('ps aux | grep -i "electron.*ricekit" | grep -v grep', { encoding: 'utf8' });
      if (result.trim()) {
        console.log('✓ App is running');
        return true;
      }
    } catch (err) {
      // App not running yet
    }
    await sleep(1000);
  }
  return false;
}

async function killApp() {
  console.log('Force quitting the application...');
  try {
    execSync('pkill -9 -f electron', { stdio: 'ignore' });
    await sleep(2000);
    console.log('✓ Application terminated');
  } catch (err) {
    // App may already be dead
  }
}

async function runTest() {
  console.log('Step 1: Check if app is running');
  const isRunning = await waitForApp();

  if (!isRunning) {
    console.log('❌ App is not running. Please start it first with: npm run dev');
    process.exit(1);
  }

  console.log('\nStep 2: Wait for initial UI state to be saved (5 seconds)');
  await sleep(5000);

  console.log('\nStep 3: Check if UI state file exists');
  if (fs.existsSync(UI_STATE_PATH)) {
    const initialState = JSON.parse(fs.readFileSync(UI_STATE_PATH, 'utf8'));
    console.log('✓ UI state file exists');
    console.log('Initial state:', JSON.stringify(initialState, null, 2));
  } else {
    console.log('⚠ UI state file does not exist yet (this is OK on first run)');
  }

  console.log('\n');
  console.log('============================================================');
  console.log('MANUAL TESTING REQUIRED');
  console.log('============================================================');
  console.log('');
  console.log('Please perform the following steps in the running app:');
  console.log('  1. Navigate to Settings view');
  console.log('  2. Go back to Themes view');
  console.log('  3. Type "nord" in the search box');
  console.log('  4. Select "Dark" filter');
  console.log('  5. Change sort to "Name (A-Z)"');
  console.log('');
  console.log('After making these changes, press Enter to continue...');

  // Wait for user input
  await new Promise(resolve => {
    process.stdin.once('data', () => resolve());
  });

  console.log('\nStep 4: Wait for state to be saved (2 seconds)');
  await sleep(2000);

  console.log('\nStep 5: Read saved UI state before crash');
  let stateBefore = null;
  if (fs.existsSync(UI_STATE_PATH)) {
    stateBefore = JSON.parse(fs.readFileSync(UI_STATE_PATH, 'utf8'));
    console.log('✓ UI state saved:');
    console.log('  - Active view:', stateBefore.activeView);
    console.log('  - Search query:', stateBefore.searchQuery || '(empty)');
    console.log('  - Filter mode:', stateBefore.filterMode);
    console.log('  - Sort mode:', stateBefore.sortMode);
    console.log('  - Timestamp:', new Date(stateBefore.timestamp).toLocaleString());
  } else {
    console.log('❌ UI state file not found!');
    process.exit(1);
  }

  console.log('\nStep 6: Force quit the application (simulating crash)');
  await killApp();

  console.log('\nStep 7: Verify app is stopped');
  await sleep(2000);
  try {
    const result = execSync('ps aux | grep -i "electron.*ricekit" | grep -v grep', { encoding: 'utf8' });
    if (result.trim()) {
      console.log('⚠ App still running, trying again...');
      await killApp();
      await sleep(2000);
    }
  } catch (err) {
    // Good, app is stopped
  }
  console.log('✓ App is stopped');

  console.log('\nStep 8: Verify UI state file still exists after crash');
  if (fs.existsSync(UI_STATE_PATH)) {
    console.log('✓ UI state file survived the crash');
  } else {
    console.log('❌ UI state file was deleted!');
    process.exit(1);
  }

  console.log('\nStep 9: Restart the application');
  console.log('Starting app...');

  const appProcess = spawn('npm', ['run', 'dev'], {
    detached: true,
    stdio: 'ignore'
  });
  appProcess.unref();

  const restarted = await waitForApp();
  if (!restarted) {
    console.log('❌ Failed to restart app');
    process.exit(1);
  }

  console.log('\nStep 10: Wait for app to fully load and restore state (5 seconds)');
  await sleep(5000);

  console.log('\nStep 11: Read UI state after restart');
  let stateAfter = null;
  if (fs.existsSync(UI_STATE_PATH)) {
    stateAfter = JSON.parse(fs.readFileSync(UI_STATE_PATH, 'utf8'));
    console.log('✓ UI state file exists after restart');
  } else {
    console.log('❌ UI state file missing after restart!');
    process.exit(1);
  }

  console.log('\n');
  console.log('============================================================');
  console.log('VERIFICATION');
  console.log('============================================================');
  console.log('');
  console.log('Please check the following in the running application:');
  console.log('  ✓ Active view is: themes (should be "themes")');
  console.log('  ✓ Search box contains: "nord"');
  console.log('  ✓ Dark filter is selected');
  console.log('  ✓ Sort is set to: Name (A-Z)');
  console.log('');
  console.log('Expected state before crash:');
  console.log(JSON.stringify(stateBefore, null, 2));
  console.log('');
  console.log('State after restart:');
  console.log(JSON.stringify(stateAfter, null, 2));
  console.log('');

  // Basic automated verification
  let passed = true;

  if (stateBefore.activeView === stateAfter.activeView) {
    console.log('✓ Active view restored correctly');
  } else {
    console.log('❌ Active view NOT restored:', stateBefore.activeView, '->', stateAfter.activeView);
    passed = false;
  }

  if (stateBefore.searchQuery === stateAfter.searchQuery) {
    console.log('✓ Search query restored correctly');
  } else {
    console.log('❌ Search query NOT restored:', stateBefore.searchQuery, '->', stateAfter.searchQuery);
    passed = false;
  }

  if (stateBefore.filterMode === stateAfter.filterMode) {
    console.log('✓ Filter mode restored correctly');
  } else {
    console.log('❌ Filter mode NOT restored:', stateBefore.filterMode, '->', stateAfter.filterMode);
    passed = false;
  }

  if (stateBefore.sortMode === stateAfter.sortMode) {
    console.log('✓ Sort mode restored correctly');
  } else {
    console.log('❌ Sort mode NOT restored:', stateBefore.sortMode, '->', stateAfter.sortMode);
    passed = false;
  }

  console.log('');
  console.log('============================================================');
  console.log('RESULT');
  console.log('============================================================');

  if (passed) {
    console.log('✅ TEST PASSED - Crash recovery is working!');
    console.log('');
    console.log('All state was successfully restored after forced quit.');
    console.log('Please verify visually that the UI matches the restored state.');
  } else {
    console.log('❌ TEST FAILED - Some state was not restored correctly');
  }

  console.log('');
  process.exit(passed ? 0 : 1);
}

// Set stdin to raw mode for user input
if (process.stdin.isTTY) {
  process.stdin.setRawMode(false);
}

runTest().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
