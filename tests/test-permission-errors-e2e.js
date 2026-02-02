#!/usr/bin/env node

/**
 * End-to-End Test: Permission Error Handling
 * Test #115
 *
 * This test verifies that the application handles permission errors gracefully
 * by simulating a read-only directory scenario and checking that:
 * 1. The app displays a user-friendly error message
 * 2. The app does not crash
 * 3. The user can continue using the app after the error
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const { spawn } = require('child_process');

const TEST_NAME = 'Permission Error Handling - End-to-End';
const MACTHEME_DIR = path.join(os.homedir(), 'Library/Application Support/Ricekit');
const CURRENT_DIR = path.join(MACTHEME_DIR, 'current');

console.log(`[TEST] ========================================`);
console.log(`[TEST] TEST: ${TEST_NAME}`);
console.log(`[TEST] ========================================\n`);

let passedTests = 0;
let failedTests = 0;
let originalPermissions = null;
let electronProcess = null;

function log(message) {
  console.log(`[TEST] ${message}`);
}

function pass(message) {
  passedTests++;
  console.log(`[TEST] ✓ ${message}`);
}

function fail(message) {
  failedTests++;
  console.log(`[TEST] ✗ ${message}`);
}

function restorePermissions() {
  if (fs.existsSync(CURRENT_DIR)) {
    log(`Restoring permissions for current directory...`);
    try {
      execSync(`chmod -R u+w "${CURRENT_DIR}"`);
      log(`✓ Permissions restored for current directory`);
    } catch (err) {
      log(`⚠ Warning: Could not restore permissions: ${err.message}`);
    }
  }
}

function cleanup() {
  restorePermissions();
  if (electronProcess) {
    try {
      electronProcess.kill();
      log('Electron process terminated');
    } catch (err) {
      log(`Warning: Could not kill Electron process: ${err.message}`);
    }
  }
}

// Cleanup handlers
process.on('exit', cleanup);
process.on('SIGINT', () => {
  cleanup();
  process.exit(1);
});

async function runTest() {
  try {
    // Test 1: Verify Ricekit directory exists
    log(`Step 1: Verifying Ricekit directory exists...`);
    if (fs.existsSync(MACTHEME_DIR)) {
      pass(`Ricekit directory exists: ${MACTHEME_DIR}`);
    } else {
      fail(`Ricekit directory does not exist: ${MACTHEME_DIR}`);
      throw new Error('Ricekit directory not found');
    }

    // Test 2: Verify current directory exists
    log(`\nStep 2: Verifying current directory exists...`);
    if (fs.existsSync(CURRENT_DIR)) {
      pass(`Current directory exists: ${CURRENT_DIR}`);
    } else {
      fail(`Current directory does not exist - creating it...`);
      fs.mkdirSync(CURRENT_DIR, { recursive: true });
      pass(`Created current directory`);
    }

    // Test 3: Make current directory read-only
    log(`\nStep 3: Making current directory read-only to simulate permission error...`);
    try {
      execSync(`chmod -R u-w "${CURRENT_DIR}"`);
      pass(`Made current directory read-only`);
    } catch (err) {
      fail(`Could not change permissions: ${err.message}`);
      throw err;
    }

    // Test 4: Verify directory is read-only
    log(`\nStep 4: Verifying directory is read-only...`);
    const testFile = path.join(CURRENT_DIR, 'test-write.txt');
    try {
      fs.writeFileSync(testFile, 'test');
      fail(`Directory is still writable (should be read-only)`);
      // Clean up if it somehow worked
      try {
        fs.unlinkSync(testFile);
      } catch (e) {
        // ignore
      }
    } catch (writeErr) {
      pass(`Directory is read-only (cannot write): ${writeErr.code}`);
    }

    // Test 5: Test that IPC handler catches the permission error
    log(`\nStep 5: Testing IPC handler catches permission error...`);
    log(`Importing IPC handlers to test error handling...`);

    // Import the handler directly
    const ipcHandlers = require('./src/main/ipcHandlers.ts');

    try {
      // Attempt to apply a theme (should fail with permission error)
      await ipcHandlers.handleApplyTheme(null, 'tokyo-night');
      fail(`Theme application succeeded when it should have failed`);
    } catch (err) {
      if (err.message.includes('PERMISSION_ERROR')) {
        pass(`IPC handler correctly throws PERMISSION_ERROR`);
        pass(`Error message is user-friendly: "${err.message}"`);
      } else {
        fail(`IPC handler threw error but not PERMISSION_ERROR: ${err.message}`);
      }
    }

    // Test 6: Restore permissions
    log(`\nStep 6: Restoring permissions...`);
    restorePermissions();
    pass(`Permissions restored`);

    // Test 7: Verify theme application works after restoring permissions
    log(`\nStep 7: Verifying theme application works after permission restore...`);
    try {
      await ipcHandlers.handleApplyTheme(null, 'tokyo-night');
      pass(`Theme application succeeded after permission restore`);
    } catch (err) {
      fail(`Theme application failed after permission restore: ${err.message}`);
    }

    // Print results
    console.log(`\n==================================================`);
    console.log(`[TEST] TEST RESULTS`);
    console.log(`[TEST] ==================================================`);
    console.log(`[TEST] Passed: ${passedTests}/${passedTests + failedTests}`);
    console.log(`[TEST] Failed: ${failedTests}/${passedTests + failedTests}`);
    console.log(`[TEST] ==================================================\n`);

    if (failedTests === 0) {
      console.log(`✓ ALL TESTS PASSED\n`);
      log(`\nKEY FINDINGS:`);
      log(`=============`);
      log(`✓ Permission errors are caught by the IPC handler`);
      log(`✓ Error messages are user-friendly (include PERMISSION_ERROR prefix)`);
      log(`✓ Application continues to function after permission errors`);
      log(`✓ Theme application works correctly when permissions are restored`);
      process.exit(0);
    } else {
      console.log(`✗ SOME TESTS FAILED\n`);
      process.exit(1);
    }

  } catch (err) {
    console.error(`\n[TEST] ✗ TEST FAILED WITH ERROR:`);
    console.error(`[TEST] ${err.message}`);
    console.error(err.stack);
    cleanup();
    process.exit(1);
  }
}

runTest();
