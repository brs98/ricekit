#!/usr/bin/env node

/**
 * Verification test for theme:apply IPC handler
 * This test verifies a previously passing feature to ensure no regressions
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Track test results
const tests = {
  passed: 0,
  failed: 0,
  errors: []
};

function log(message) {
  console.log(`[TEST] ${message}`);
}

function pass(testName) {
  tests.passed++;
  log(`✓ PASS: ${testName}`);
}

function fail(testName, error) {
  tests.failed++;
  tests.errors.push({ test: testName, error });
  log(`✗ FAIL: ${testName} - ${error}`);
}

async function runTests() {
  log('Starting verification test for theme:apply');

  try {
    // Import the IPC handlers
    const { setupIpcHandlers, handleApplyTheme } = require('./dist-electron/ipcHandlers.js');

    // Test 1: Verify handleApplyTheme function exists
    if (typeof handleApplyTheme === 'function') {
      pass('handleApplyTheme function exists');
    } else {
      fail('handleApplyTheme function exists', 'Function not found');
      process.exit(1);
    }

    // Test 2: Verify symlink can be created
    const homeDir = require('os').homedir();
    const currentDir = path.join(homeDir, 'Library', 'Application Support', 'Ricekit', 'current');
    const symlinkPath = path.join(currentDir, 'theme');

    // Test 3: Apply tokyo-night theme
    try {
      await handleApplyTheme(null, 'tokyo-night');
      pass('theme:apply executed without error');
    } catch (err) {
      fail('theme:apply executed without error', err.message);
    }

    // Test 4: Verify symlink exists
    if (fs.existsSync(symlinkPath)) {
      pass('Symlink created at current/theme');
    } else {
      fail('Symlink created at current/theme', 'Symlink not found');
    }

    // Test 5: Verify symlink points to tokyo-night
    if (fs.existsSync(symlinkPath)) {
      const linkTarget = fs.readlinkSync(symlinkPath);
      if (linkTarget.includes('tokyo-night')) {
        pass('Symlink points to tokyo-night theme');
      } else {
        fail('Symlink points to tokyo-night theme', `Points to ${linkTarget}`);
      }
    }

    // Test 6: Verify state.json updated
    const statePath = path.join(homeDir, 'Library', 'Application Support', 'Ricekit', 'state.json');
    if (fs.existsSync(statePath)) {
      const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      if (state.currentTheme === 'tokyo-night') {
        pass('state.json updated with currentTheme');
      } else {
        fail('state.json updated with currentTheme', `Current theme is ${state.currentTheme}`);
      }
    } else {
      fail('state.json exists', 'File not found');
    }

  } catch (error) {
    fail('Overall test execution', error.message);
    console.error(error);
  }

  // Summary
  log('\n' + '='.repeat(50));
  log(`VERIFICATION TEST RESULTS`);
  log(`Passed: ${tests.passed}`);
  log(`Failed: ${tests.failed}`);

  if (tests.failed > 0) {
    log('\nFailed tests:');
    tests.errors.forEach(({ test, error }) => {
      log(`  - ${test}: ${error}`);
    });
  }

  log('='.repeat(50));

  // Exit with appropriate code
  process.exit(tests.failed > 0 ? 1 : 0);
}

// When run directly
if (require.main === module) {
  app.whenReady().then(runTests).catch(err => {
    console.error('Test failed to start:', err);
    process.exit(1);
  });
}
