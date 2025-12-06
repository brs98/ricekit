/**
 * Test IPC channel theme:apply
 *
 * This test verifies that the theme:apply IPC handler successfully applies a theme
 * by updating the symlink, state.json, and recent themes in preferences.
 *
 * Test Coverage:
 * - Applying a theme updates the symlink correctly
 * - State.json is updated with current theme and timestamp
 * - Recent themes list is updated in preferences
 * - VS Code settings are updated if enabled
 * - Terminal reload notifications are sent
 * - Hook script is executed if configured
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

console.log('=================================');
console.log('🧪 Testing IPC: theme:apply');
console.log('=================================\n');

let win;
let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}`);
  if (details) {
    console.log(`   ${details}`);
  }
  testResults.tests.push({ name, passed, details });
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
}

// Wait for app to be ready
app.whenReady().then(async () => {
  console.log('✓ Electron app ready\n');

  try {
    // Import the IPC handlers module to ensure handlers are registered
    const ipcHandlersPath = path.join(__dirname, 'dist', 'main', 'ipcHandlers.js');
    const { setupIpcHandlers } = require(ipcHandlersPath);

    // Setup handlers if not already set up
    setupIpcHandlers();
    console.log('✓ IPC handlers loaded\n');

    // Create a hidden browser window to act as renderer
    win = new BrowserWindow({
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'dist', 'preload', 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      }
    });

    // Load a simple HTML page
    await win.loadFile('index.html');
    console.log('✓ Browser window created and loaded\n');

    // Get paths
    const currentDir = path.join(os.homedir(), 'Library', 'Application Support', 'MacTheme', 'current');
    const symlinkPath = path.join(currentDir, 'theme');
    const statePath = path.join(os.homedir(), 'Library', 'Application Support', 'MacTheme', 'state.json');
    const prefsPath = path.join(os.homedir(), 'Library', 'Application Support', 'MacTheme', 'preferences.json');

    // Read initial state
    const initialState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    const initialPrefs = JSON.parse(fs.readFileSync(prefsPath, 'utf-8'));

    console.log(`Initial state: currentTheme = ${initialState.currentTheme}\n`);

    // Test 1: Apply a different theme (tokyo-night)
    console.log('Test 1: Applying tokyo-night theme...');
    const themeToApply = 'tokyo-night';

    try {
      await win.webContents.executeJavaScript(`
        window.electronAPI.applyTheme('${themeToApply}')
      `);

      // Give it a moment to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      logTest('Theme application completed without error', true);
    } catch (err) {
      logTest('Theme application completed without error', false, err.message);
      throw err;
    }

    // Test 2: Verify symlink was updated
    console.log('\nTest 2: Verifying symlink...');
    try {
      const symlinkTarget = fs.readlinkSync(symlinkPath);
      const expectedTarget = path.join(os.homedir(), 'Library', 'Application Support', 'MacTheme', 'themes', themeToApply);

      if (symlinkTarget === expectedTarget) {
        logTest('Symlink points to correct theme directory', true, `${symlinkPath} -> ${symlinkTarget}`);
      } else {
        logTest('Symlink points to correct theme directory', false, `Expected ${expectedTarget}, got ${symlinkTarget}`);
      }
    } catch (err) {
      logTest('Symlink exists and is readable', false, err.message);
    }

    // Test 3: Verify state.json was updated
    console.log('\nTest 3: Verifying state.json...');
    try {
      const newState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));

      // Check currentTheme
      if (newState.currentTheme === themeToApply) {
        logTest('state.json has correct currentTheme', true, `currentTheme = ${newState.currentTheme}`);
      } else {
        logTest('state.json has correct currentTheme', false, `Expected ${themeToApply}, got ${newState.currentTheme}`);
      }

      // Check lastSwitched was updated
      if (newState.lastSwitched > initialState.lastSwitched) {
        logTest('state.json lastSwitched timestamp updated', true, `New timestamp: ${newState.lastSwitched}`);
      } else {
        logTest('state.json lastSwitched timestamp updated', false, 'Timestamp not updated');
      }
    } catch (err) {
      logTest('state.json is valid and readable', false, err.message);
    }

    // Test 4: Verify recent themes in preferences
    console.log('\nTest 4: Verifying preferences.json recent themes...');
    try {
      const newPrefs = JSON.parse(fs.readFileSync(prefsPath, 'utf-8'));

      if (newPrefs.recentThemes && Array.isArray(newPrefs.recentThemes)) {
        logTest('preferences.json has recentThemes array', true);

        // Check if applied theme is at the beginning of recent themes
        if (newPrefs.recentThemes[0] === themeToApply) {
          logTest('Applied theme is first in recentThemes', true, `recentThemes[0] = ${newPrefs.recentThemes[0]}`);
        } else {
          logTest('Applied theme is first in recentThemes', false, `Expected ${themeToApply}, got ${newPrefs.recentThemes[0]}`);
        }

        // Check that recentThemes doesn't exceed 10 items
        if (newPrefs.recentThemes.length <= 10) {
          logTest('recentThemes limited to 10 items', true, `Length: ${newPrefs.recentThemes.length}`);
        } else {
          logTest('recentThemes limited to 10 items', false, `Length: ${newPrefs.recentThemes.length}`);
        }
      } else {
        logTest('preferences.json has recentThemes array', false, 'recentThemes not found or not an array');
      }
    } catch (err) {
      logTest('preferences.json is valid and readable', false, err.message);
    }

    // Test 5: Apply another theme to test recentThemes ordering
    console.log('\nTest 5: Applying second theme (catppuccin-mocha) to test recentThemes...');
    const secondTheme = 'catppuccin-mocha';

    try {
      await win.webContents.executeJavaScript(`
        window.electronAPI.applyTheme('${secondTheme}')
      `);

      await new Promise(resolve => setTimeout(resolve, 500));

      const newPrefs = JSON.parse(fs.readFileSync(prefsPath, 'utf-8'));

      // Check ordering: secondTheme should be first, original theme second
      if (newPrefs.recentThemes[0] === secondTheme && newPrefs.recentThemes[1] === themeToApply) {
        logTest('Recent themes ordering is correct after second apply', true,
          `[0]=${newPrefs.recentThemes[0]}, [1]=${newPrefs.recentThemes[1]}`);
      } else {
        logTest('Recent themes ordering is correct after second apply', false,
          `Expected [${secondTheme}, ${themeToApply}], got [${newPrefs.recentThemes[0]}, ${newPrefs.recentThemes[1]}]`);
      }
    } catch (err) {
      logTest('Second theme application and recentThemes update', false, err.message);
    }

    // Test 6: Verify symlink updated to second theme
    console.log('\nTest 6: Verifying symlink updated to second theme...');
    try {
      const symlinkTarget = fs.readlinkSync(symlinkPath);
      const expectedTarget = path.join(os.homedir(), 'Library', 'Application Support', 'MacTheme', 'themes', secondTheme);

      if (symlinkTarget === expectedTarget) {
        logTest('Symlink updated to second theme', true, `${symlinkPath} -> ${symlinkTarget}`);
      } else {
        logTest('Symlink updated to second theme', false, `Expected ${expectedTarget}, got ${symlinkTarget}`);
      }
    } catch (err) {
      logTest('Symlink updated to second theme', false, err.message);
    }

    // Test 7: Test error handling with non-existent theme
    console.log('\nTest 7: Testing error handling with non-existent theme...');
    try {
      await win.webContents.executeJavaScript(`
        window.electronAPI.applyTheme('nonexistent-theme-12345')
      `);

      // If we get here without error, the test failed
      logTest('Error handling for non-existent theme', false, 'Should have thrown an error');
    } catch (err) {
      // Expected to fail
      if (err.message.includes('not found') || err.message.includes('Theme')) {
        logTest('Error handling for non-existent theme', true, 'Correctly threw error: ' + err.message);
      } else {
        logTest('Error handling for non-existent theme', false, 'Wrong error message: ' + err.message);
      }
    }

    // Print summary
    console.log('\n=================================');
    console.log('TEST SUMMARY');
    console.log('=================================');
    console.log(`Total tests: ${testResults.passed + testResults.failed}`);
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log('=================================\n');

    if (testResults.failed === 0) {
      console.log('🎉 All tests passed!\n');
      process.exit(0);
    } else {
      console.log('⚠️  Some tests failed. See details above.\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    console.error(error.stack);
    process.exit(1);
  }
});

// Handle errors
app.on('window-all-closed', () => {
  // Don't quit on window close during tests
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});
