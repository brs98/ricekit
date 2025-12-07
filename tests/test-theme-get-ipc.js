/**
 * Test IPC channel theme:get
 *
 * This test verifies that the theme:get IPC handler returns specific theme data correctly.
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');

console.log('=================================');
console.log('🧪 Testing IPC: theme:get');
console.log('=================================\n');

let win;

// Wait for app to be ready
app.whenReady().then(async () => {
  console.log('✓ Electron app ready\n');

  try {
    // Import the IPC handlers module to ensure handlers are registered
    const ipcHandlersPath = path.join(__dirname, 'dist', 'main', 'ipcHandlers.js');
    const { setupIpcHandlers } = require(ipcHandlersPath);

    // Setup handlers
    setupIpcHandlers();
    console.log('✓ IPC handlers loaded\n');

    // Create a hidden browser window to act as renderer
    win = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'dist', 'preload', 'preload.js')
      }
    });

    // Load a blank page
    await win.loadURL('data:text/html,<html><body></body></html>');

    console.log('✓ Test window created\n');

    // Execute test code in renderer process and get results
    const testResult = await win.webContents.executeJavaScript(`
      (async () => {
        const results = {
          passed: true,
          errors: [],
          tests: []
        };

        try {
          // Test 1: Get a specific theme (tokyo-night)
          console.log('Test 1: Get specific theme "tokyo-night"');
          const tokyoNight = await window.electronAPI.getTheme('tokyo-night');

          if (!tokyoNight) {
            results.passed = false;
            results.errors.push('tokyo-night theme not found');
            return results;
          }

          results.tests.push({
            name: 'Get tokyo-night',
            passed: true,
            theme: {
              name: tokyoNight.name,
              displayName: tokyoNight.metadata.name,
              author: tokyoNight.metadata.author
            }
          });

          // Verify structure
          const requiredProps = ['name', 'path', 'metadata', 'isCustom', 'isLight'];
          const missingProps = requiredProps.filter(prop => !(prop in tokyoNight));
          if (missingProps.length > 0) {
            results.passed = false;
            results.errors.push(\`tokyo-night missing properties: \${missingProps.join(', ')}\`);
          }

          // Verify metadata
          if (!tokyoNight.metadata || !tokyoNight.metadata.name || !tokyoNight.metadata.colors) {
            results.passed = false;
            results.errors.push('tokyo-night has incomplete metadata');
          }

          // Test 2: Verify theme.json contents are returned
          console.log('Test 2: Verify complete metadata');
          const requiredMetadata = ['name', 'author', 'description', 'version', 'colors'];
          const missingMetadata = requiredMetadata.filter(prop => !(prop in tokyoNight.metadata));

          if (missingMetadata.length === 0) {
            results.tests.push({
              name: 'Complete metadata',
              passed: true
            });
          } else {
            results.passed = false;
            results.errors.push(\`Missing metadata fields: \${missingMetadata.join(', ')}\`);
          }

          // Test 3: Verify file paths are included
          console.log('Test 3: Verify file path is included');
          if (tokyoNight.path && typeof tokyoNight.path === 'string' && tokyoNight.path.includes('tokyo-night')) {
            results.tests.push({
              name: 'File path included',
              passed: true,
              path: tokyoNight.path
            });
          } else {
            results.passed = false;
            results.errors.push('Theme path missing or invalid');
          }

          // Test 4: Verify error handling for non-existent theme
          console.log('Test 4: Error handling for non-existent theme');
          const nonExistent = await window.electronAPI.getTheme('non-existent-theme-xyz');

          if (nonExistent === null) {
            results.tests.push({
              name: 'Non-existent theme returns null',
              passed: true
            });
          } else {
            results.passed = false;
            results.errors.push('Non-existent theme did not return null');
          }

          // Test 5: Get another theme to verify consistency
          console.log('Test 5: Get another theme (catppuccin-mocha)');
          const catppuccin = await window.electronAPI.getTheme('catppuccin-mocha');

          if (catppuccin && catppuccin.name === 'catppuccin-mocha') {
            results.tests.push({
              name: 'Get catppuccin-mocha',
              passed: true,
              theme: {
                name: catppuccin.name,
                displayName: catppuccin.metadata.name,
                author: catppuccin.metadata.author
              }
            });
          } else {
            results.passed = false;
            results.errors.push('Failed to get catppuccin-mocha theme');
          }

          return results;

        } catch (error) {
          results.passed = false;
          results.errors.push(\`Exception: \${error.message}\`);
          return results;
        }
      })();
    `);

    // Display results
    console.log('=================================');
    console.log('TEST RESULTS');
    console.log('=================================\n');

    testResult.tests.forEach((test, index) => {
      console.log(`Test ${index + 1}: ${test.name}`);
      console.log('---------------------------------------');
      console.log(`✅ ${test.passed ? 'PASSED' : 'FAILED'}`);
      if (test.theme) {
        console.log(`  Theme: ${test.theme.name}`);
        console.log(`  Display Name: ${test.theme.displayName}`);
        console.log(`  Author: ${test.theme.author}`);
      }
      if (test.path) {
        console.log(`  Path: ${test.path}`);
      }
      console.log();
    });

    // Display any errors
    if (testResult.errors.length > 0) {
      console.log('❌ ERRORS FOUND:');
      console.log('---------------------------------------');
      testResult.errors.forEach(err => console.log(`  - ${err}`));
      console.log();
    }

    // Summary
    console.log('=================================');
    if (testResult.passed) {
      console.log('✅ ALL TESTS PASSED');
    } else {
      console.log('❌ TESTS FAILED');
    }
    console.log('=================================');
    console.log(`Tests run: ${testResult.tests.length}`);
    console.log(`Tests passed: ${testResult.tests.filter(t => t.passed).length}`);
    console.log(`Tests failed: ${testResult.tests.filter(t => !t.passed).length}`);
    console.log('\n' + (testResult.passed ? 'The theme:get IPC handler is working correctly!' : 'There were test failures.'));
    console.log('=================================\n');

    win.close();
    app.quit();

  } catch (error) {
    console.error('\n❌ ERROR during test setup:');
    console.error(error);
    if (win) win.close();
    app.quit();
  }
});

// Handle app quit
app.on('window-all-closed', () => {
  app.quit();
});
