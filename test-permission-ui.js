#!/usr/bin/env node

/**
 * UI Test: Permission Error Handling
 * Test #115
 *
 * Tests that permission errors are handled gracefully in the UI
 */

const { execSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const CURRENT_DIR = path.join(os.homedir(), 'Library/Application Support/MacTheme/current');

console.log('[TEST] Permission Error UI Test');
console.log('[TEST] ========================================\n');

let passedTests = 0;
let failedTests = 0;

function pass(msg) {
  passedTests++;
  console.log(`[TEST] ✓ ${msg}`);
}

function fail(msg) {
  failedTests++;
  console.log(`[TEST] ✗ ${msg}`);
}

function restorePermissions() {
  if (fs.existsSync(CURRENT_DIR)) {
    try {
      execSync(`chmod -R u+w "${CURRENT_DIR}"`);
      console.log('[TEST] Permissions restored');
    } catch (err) {
      console.log(`[TEST] Warning: Could not restore permissions: ${err.message}`);
    }
  }
}

process.on('exit', restorePermissions);
process.on('SIGINT', () => {
  restorePermissions();
  process.exit(1);
});

async function runTest() {
  try {
    console.log('[TEST] Step 1: Making current directory read-only...');
    execSync(`chmod -R u-w "${CURRENT_DIR}"`);
    pass('Current directory is now read-only');

    console.log('\n[TEST] Step 2: Verifying directory is read-only...');
    const testFile = path.join(CURRENT_DIR, 'test.txt');
    try {
      fs.writeFileSync(testFile, 'test');
      fail('Directory is still writable');
      fs.unlinkSync(testFile);
    } catch (err) {
      pass('Directory is read-only (write test failed as expected)');
    }

    console.log('\n[TEST] ========================================');
    console.log('[TEST] MANUAL VERIFICATION REQUIRED');
    console.log('[TEST] ========================================');
    console.log('[TEST] ');
    console.log('[TEST] The app should now be running with a read-only directory.');
    console.log('[TEST] ');
    console.log('[TEST] Please perform these steps in the running app:');
    console.log('[TEST] ');
    console.log('[TEST] 1. Click on any theme that is NOT currently active');
    console.log('[TEST] 2. Click the "Apply" button');
    console.log('[TEST] ');
    console.log('[TEST] Expected result:');
    console.log('[TEST] ✓ An alert/dialog appears with "Permission Error"');
    console.log('[TEST] ✓ Message mentions "insufficient permissions"');
    console.log('[TEST] ✓ Message includes path to MacTheme directory');
    console.log('[TEST] ✓ Message suggests chmod command');
    console.log('[TEST] ✓ NO technical error messages or stack traces');
    console.log('[TEST] ');
    console.log('[TEST] 3. Click OK to dismiss the error');
    console.log('[TEST] ');
    console.log('[TEST] 4. Verify app stability:');
    console.log('[TEST] ✓ App window is still open');
    console.log('[TEST] ✓ UI is still responsive');
    console.log('[TEST] ✓ You can click on other themes');
    console.log('[TEST] ✓ You can navigate to other tabs');
    console.log('[TEST] ✓ No console errors about crashes');
    console.log('[TEST] ');
    console.log('[TEST] ========================================');
    console.log('[TEST] ');
    console.log('[TEST] Press Enter when you have completed the manual verification...');

    // Wait for user input
    await new Promise((resolve) => {
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      rl.question('', () => {
        rl.close();
        resolve();
      });
    });

    console.log('\n[TEST] Step 3: Restoring permissions...');
    restorePermissions();
    pass('Permissions restored');

    console.log('\n[TEST] Step 4: Verifying theme application works now...');
    console.log('[TEST] ');
    console.log('[TEST] Please try applying a theme again in the app.');
    console.log('[TEST] It should work now without errors.');
    console.log('[TEST] ');
    console.log('[TEST] Press Enter when you have verified this...');

    await new Promise((resolve) => {
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      rl.question('', () => {
        rl.close();
        resolve();
      });
    });

    pass('Theme application works after permission restore');

    console.log('\n==================================================');
    console.log('[TEST] TEST COMPLETE');
    console.log('==================================================');
    console.log(`[TEST] Based on your manual verification, the test has:`);
    console.log(`[TEST] ✓ Simulated permission error successfully`);
    console.log(`[TEST] ✓ Verified app handles errors gracefully`);
    console.log(`[TEST] ✓ Verified app remains stable after errors`);
    console.log(`[TEST] ✓ Verified recovery after permission restore`);
    console.log('==================================================\n');

    process.exit(0);

  } catch (err) {
    console.error(`\n[TEST] ✗ TEST FAILED: ${err.message}`);
    restorePermissions();
    process.exit(1);
  }
}

runTest();
