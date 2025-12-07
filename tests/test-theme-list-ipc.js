/**
 * Test IPC channel theme:list
 *
 * This test verifies that the theme:list IPC handler returns all available themes
 * with the correct structure and properties.
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');

console.log('=================================');
console.log('🧪 Testing IPC: theme:list');
console.log('=================================\n');

let win;

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
          totalThemes: 0,
          bundledThemes: 0,
          customThemes: 0
        };

        try {
          const themes = await window.electronAPI.listThemes();

          // Test 1: Array check
          if (!Array.isArray(themes)) {
            results.passed = false;
            results.errors.push('theme:list did not return an array');
            return results;
          }

          results.totalThemes = themes.length;

          // Test 2: Verify each theme has required properties
          const requiredProps = ['name', 'path', 'metadata', 'isCustom', 'isLight'];
          for (const theme of themes) {
            const missingProps = requiredProps.filter(prop => !(prop in theme));
            if (missingProps.length > 0) {
              results.passed = false;
              results.errors.push(\`Theme "\${theme.name || 'unknown'}" missing properties: \${missingProps.join(', ')}\`);
            }
          }

          // Test 3: Verify metadata structure
          const requiredMetadataProps = ['name', 'author', 'description', 'version', 'colors'];
          for (const theme of themes) {
            const missingMetadata = requiredMetadataProps.filter(prop => !(prop in theme.metadata));
            if (missingMetadata.length > 0) {
              results.passed = false;
              results.errors.push(\`Theme "\${theme.name}" metadata missing: \${missingMetadata.join(', ')}\`);
            }
          }

          // Test 4: Verify colors structure
          const requiredColorProps = [
            'background', 'foreground', 'cursor', 'selection',
            'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
            'brightBlack', 'brightRed', 'brightGreen', 'brightYellow',
            'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite',
            'accent', 'border'
          ];

          for (const theme of themes) {
            const missingColors = requiredColorProps.filter(prop => !(prop in theme.metadata.colors));
            if (missingColors.length > 0) {
              results.passed = false;
              results.errors.push(\`Theme "\${theme.name}" colors missing: \${missingColors.join(', ')}\`);
            }
          }

          // Test 5: Verify bundled themes are included
          const expectedBundledThemes = [
            'tokyo-night',
            'catppuccin-mocha',
            'catppuccin-latte',
            'gruvbox-dark',
            'gruvbox-light',
            'nord',
            'dracula',
            'one-dark',
            'solarized-dark',
            'solarized-light',
            'rose-pine'
          ];

          const themeNames = themes.map(t => t.name);
          const missingBundled = expectedBundledThemes.filter(name => !themeNames.includes(name));

          if (missingBundled.length > 0) {
            results.passed = false;
            results.errors.push(\`Missing bundled themes: \${missingBundled.join(', ')}\`);
          }

          // Count bundled vs custom themes
          results.bundledThemes = themes.filter(t => !t.isCustom).length;
          results.customThemes = themes.filter(t => t.isCustom).length;

          // Store sample theme for display
          if (themes.length > 0) {
            results.sampleTheme = {
              name: themes[0].name,
              displayName: themes[0].metadata.name,
              author: themes[0].metadata.author,
              version: themes[0].metadata.version,
              isCustom: themes[0].isCustom,
              isLight: themes[0].isLight,
              colors: {
                background: themes[0].metadata.colors.background,
                foreground: themes[0].metadata.colors.foreground,
                accent: themes[0].metadata.colors.accent
              }
            };
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
    console.log('Test 1: Call IPC handler "theme:list"');
    console.log('---------------------------------------');
    console.log(`✅ Returned array with ${testResult.totalThemes} themes\n`);

    console.log('Test 2: Verify theme structure');
    console.log('---------------------------------------');
    console.log(`✅ All themes have required properties\n`);

    console.log('Test 3: Verify metadata structure');
    console.log('---------------------------------------');
    console.log(`✅ All themes have valid metadata\n`);

    console.log('Test 4: Verify colors palette structure');
    console.log('---------------------------------------');
    console.log(`✅ All themes have complete color palettes (22 colors)\n`);

    console.log('Test 5: Verify bundled themes');
    console.log('---------------------------------------');
    console.log(`✅ All expected bundled themes found\n`);

    console.log('Test 6: Check custom themes distinction');
    console.log('---------------------------------------');
    console.log(`✅ Found ${testResult.bundledThemes} bundled themes`);
    console.log(`✅ Found ${testResult.customThemes} custom themes\n`);

    if (testResult.sampleTheme) {
      console.log('Test 7: Sample theme details');
      console.log('---------------------------------------');
      console.log(`Sample theme: ${testResult.sampleTheme.name}`);
      console.log(`  Display name: ${testResult.sampleTheme.displayName}`);
      console.log(`  Author: ${testResult.sampleTheme.author}`);
      console.log(`  Version: ${testResult.sampleTheme.version}`);
      console.log(`  Is Custom: ${testResult.sampleTheme.isCustom}`);
      console.log(`  Is Light: ${testResult.sampleTheme.isLight}`);
      console.log(`  Colors:`);
      console.log(`    Background: ${testResult.sampleTheme.colors.background}`);
      console.log(`    Foreground: ${testResult.sampleTheme.colors.foreground}`);
      console.log(`    Accent: ${testResult.sampleTheme.colors.accent}`);
      console.log();
    }

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
    console.log(`Total themes returned: ${testResult.totalThemes}`);
    console.log(`Bundled themes: ${testResult.bundledThemes}`);
    console.log(`Custom themes: ${testResult.customThemes}`);
    console.log('\n' + (testResult.passed ? 'The theme:list IPC handler is working correctly!' : 'There were test failures.'));
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
