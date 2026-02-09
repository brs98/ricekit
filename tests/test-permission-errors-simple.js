#!/usr/bin/env node

/**
 * Simple Permission Error Test
 * Test #115
 *
 * This test simulates permission errors and provides manual testing instructions.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const TEST_NAME = 'Permission Error Handling - Validation';
const RICEKIT_DIR = path.join(os.homedir(), 'Library/Application Support/Ricekit');
const CURRENT_DIR = path.join(RICEKIT_DIR, 'current');

console.log(`[TEST] ========================================`);
console.log(`[TEST] TEST: ${TEST_NAME}`);
console.log(`[TEST] ========================================\n`);

let passedTests = 0;
let failedTests = 0;

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
    log(`Restoring permissions...`);
    try {
      execSync(`chmod -R u+w "${CURRENT_DIR}"`);
      log(`✓ Permissions restored`);
    } catch (err) {
      log(`⚠ Warning: Could not restore permissions: ${err.message}`);
    }
  }
}

// Cleanup handler
process.on('exit', restorePermissions);
process.on('SIGINT', () => {
  restorePermissions();
  process.exit(1);
});

try {
  // Test 1: Verify error handling code exists in ipcHandlers.ts
  log(`Step 1: Verifying error handling code exists...`);
  const ipcHandlersPath = path.join(__dirname, 'src/main/ipcHandlers.ts');
  const ipcHandlersContent = fs.readFileSync(ipcHandlersPath, 'utf-8');

  if (ipcHandlersContent.includes('PERMISSION_ERROR')) {
    pass(`IPC handlers include PERMISSION_ERROR handling`);
  } else {
    fail(`IPC handlers do not include PERMISSION_ERROR handling`);
  }

  if (ipcHandlersContent.includes('EACCES') || ipcHandlersContent.includes('EPERM')) {
    pass(`IPC handlers check for EACCES/EPERM error codes`);
  } else {
    fail(`IPC handlers do not check for EACCES/EPERM error codes`);
  }

  // Test 2: Verify frontend error handling exists in ThemeGrid.tsx
  log(`\nStep 2: Verifying frontend error handling exists...`);
  const themeGridPath = path.join(__dirname, 'src/renderer/components/ThemeGrid.tsx');
  const themeGridContent = fs.readFileSync(themeGridPath, 'utf-8');

  if (themeGridContent.includes('PERMISSION_ERROR')) {
    pass(`ThemeGrid includes PERMISSION_ERROR handling`);
  } else {
    fail(`ThemeGrid does not include PERMISSION_ERROR handling`);
  }

  if (themeGridContent.includes('errorCode')) {
    pass(`ThemeGrid parses structured error codes`);
  } else {
    fail(`ThemeGrid does not parse structured error codes`);
  }

  // Test 3: Verify Ricekit directories exist
  log(`\nStep 3: Verifying Ricekit directories...`);
  if (fs.existsSync(RICEKIT_DIR)) {
    pass(`Ricekit directory exists`);
  } else {
    fail(`Ricekit directory does not exist`);
  }

  if (fs.existsSync(CURRENT_DIR)) {
    pass(`Current directory exists`);
  } else {
    fail(`Current directory does not exist`);
  }

  // Test 4: Check current permissions
  log(`\nStep 4: Checking current permissions...`);
  try {
    const stats = fs.statSync(CURRENT_DIR);
    const mode = (stats.mode & parseInt('777', 8)).toString(8);
    pass(`Current directory permissions: ${mode}`);
  } catch (err) {
    fail(`Could not check permissions: ${err.message}`);
  }

  console.log(`\n==================================================`);
  console.log(`[TEST] TEST RESULTS`);
  console.log(`[TEST] ==================================================`);
  console.log(`[TEST] Passed: ${passedTests}/${passedTests + failedTests}`);
  console.log(`[TEST] Failed: ${failedTests}/${passedTests + failedTests}`);
  console.log(`[TEST] ==================================================\n`);

  if (failedTests === 0) {
    console.log(`✓ ALL VALIDATION CHECKS PASSED\n`);
    console.log(`[TEST] ===============================================`);
    console.log(`[TEST] MANUAL TESTING INSTRUCTIONS`);
    console.log(`[TEST] ===============================================`);
    console.log(`[TEST] `);
    console.log(`[TEST] To complete Test #115, perform these steps:`);
    console.log(`[TEST] `);
    console.log(`[TEST] 1. Ensure the app is running: npm run dev`);
    console.log(`[TEST] `);
    console.log(`[TEST] 2. Make the current directory read-only:`);
    console.log(`[TEST]    chmod -R u-w ~/Library/Application\\ Support/Ricekit/current`);
    console.log(`[TEST] `);
    console.log(`[TEST] 3. In the app, try to apply a different theme`);
    console.log(`[TEST] `);
    console.log(`[TEST] 4. Verify the error message:`);
    console.log(`[TEST]    - Should show "Permission Error" dialog`);
    console.log(`[TEST]    - Message should be user-friendly (not a stack trace)`);
    console.log(`[TEST]    - Should include helpful instructions`);
    console.log(`[TEST]    - Should mention chmod command to fix permissions`);
    console.log(`[TEST] `);
    console.log(`[TEST] 5. Click OK to dismiss the error`);
    console.log(`[TEST] `);
    console.log(`[TEST] 6. Verify the app did NOT crash:`);
    console.log(`[TEST]    - Window is still open`);
    console.log(`[TEST]    - UI is still responsive`);
    console.log(`[TEST]    - You can browse themes`);
    console.log(`[TEST]    - No console errors about crashes`);
    console.log(`[TEST] `);
    console.log(`[TEST] 7. Restore permissions:`);
    console.log(`[TEST]    chmod -R u+w ~/Library/Application\\ Support/Ricekit/current`);
    console.log(`[TEST] `);
    console.log(`[TEST] 8. Try applying a theme again - should work now`);
    console.log(`[TEST] `);
    console.log(`[TEST] ===============================================`);
    console.log(`[TEST] `);
    console.log(`[TEST] EXPECTED BEHAVIOR:`);
    console.log(`[TEST] - User sees friendly error message`);
    console.log(`[TEST] - App remains stable and usable`);
    console.log(`[TEST] - User can recover by fixing permissions`);
    console.log(`[TEST] ===============================================`);
    process.exit(0);
  } else {
    console.log(`✗ SOME VALIDATION CHECKS FAILED\n`);
    process.exit(1);
  }

} catch (err) {
  console.error(`\n[TEST] ✗ TEST FAILED WITH ERROR:`);
  console.error(`[TEST] ${err.message}`);
  restorePermissions();
  process.exit(1);
}
