/**
 * Test IPC channel theme:create
 *
 * This test verifies that the theme:create IPC handler successfully creates a new custom theme
 * with all required configuration files.
 *
 * Test Coverage:
 * - Creating a theme generates all config files
 * - Theme directory is created in custom-themes
 * - theme.json contains correct metadata
 * - All 12 config files are generated
 * - Theme can be listed and retrieved after creation
 * - Error handling for duplicate themes
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

console.log('=================================');
console.log('🧪 Testing IPC: theme:create');
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
    const customThemesDir = path.join(os.homedir(), 'Library', 'Application Support', 'Ricekit', 'custom-themes');
    const testThemeName = 'test-theme-' + Date.now();
    const testThemeDirName = testThemeName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const testThemeDir = path.join(customThemesDir, testThemeDirName);

    // Prepare theme data
    const themeData = {
      name: testThemeName,
      author: 'Test Author',
      description: 'A test theme created by automated testing',
      version: '1.0.0',
      colors: {
        background: '#1a1b26',
        foreground: '#c0caf5',
        cursor: '#c0caf5',
        selection: '#283457',
        black: '#15161e',
        red: '#f7768e',
        green: '#9ece6a',
        yellow: '#e0af68',
        blue: '#7aa2f7',
        magenta: '#bb9af7',
        cyan: '#7dcfff',
        white: '#a9b1d6',
        brightBlack: '#414868',
        brightRed: '#f7768e',
        brightGreen: '#9ece6a',
        brightYellow: '#e0af68',
        brightBlue: '#7aa2f7',
        brightMagenta: '#bb9af7',
        brightCyan: '#7dcfff',
        brightWhite: '#c0caf5',
        accent: '#7aa2f7',
        border: '#414868',
      }
    };

    console.log(`Test theme: ${testThemeName}`);
    console.log(`Expected directory: ${testThemeDir}\n`);

    // Clean up any existing test theme
    if (fs.existsSync(testThemeDir)) {
      fs.rmSync(testThemeDir, { recursive: true, force: true });
      console.log('Cleaned up existing test theme directory\n');
    }

    // Test 1: Create the theme
    console.log('Test 1: Creating custom theme...');
    try {
      await win.webContents.executeJavaScript(`
        window.electronAPI.createTheme(${JSON.stringify(themeData)})
      `);

      // Give it a moment to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      logTest('Theme creation completed without error', true);
    } catch (err) {
      logTest('Theme creation completed without error', false, err.message);
      throw err;
    }

    // Test 2: Verify theme directory was created
    console.log('\nTest 2: Verifying theme directory...');
    if (fs.existsSync(testThemeDir)) {
      logTest('Theme directory created in custom-themes', true, testThemeDir);
    } else {
      logTest('Theme directory created in custom-themes', false, `Directory not found: ${testThemeDir}`);
    }

    // Test 3: Verify theme.json exists and has correct content
    console.log('\nTest 3: Verifying theme.json...');
    const themeJsonPath = path.join(testThemeDir, 'theme.json');
    if (fs.existsSync(themeJsonPath)) {
      logTest('theme.json file exists', true);

      try {
        const themeJson = JSON.parse(fs.readFileSync(themeJsonPath, 'utf-8'));

        // Verify metadata fields
        if (themeJson.name === testThemeName) {
          logTest('theme.json has correct name', true, `name = ${themeJson.name}`);
        } else {
          logTest('theme.json has correct name', false, `Expected ${testThemeName}, got ${themeJson.name}`);
        }

        if (themeJson.author === 'Test Author') {
          logTest('theme.json has correct author', true);
        } else {
          logTest('theme.json has correct author', false, `Expected 'Test Author', got ${themeJson.author}`);
        }

        if (themeJson.colors && Object.keys(themeJson.colors).length === 22) {
          logTest('theme.json has complete color palette (22 colors)', true);
        } else {
          logTest('theme.json has complete color palette (22 colors)', false,
            `Expected 22 colors, got ${Object.keys(themeJson.colors || {}).length}`);
        }
      } catch (err) {
        logTest('theme.json is valid JSON', false, err.message);
      }
    } else {
      logTest('theme.json file exists', false, 'File not found');
    }

    // Test 4: Verify all config files were generated
    console.log('\nTest 4: Verifying config files...');
    const expectedConfigFiles = [
      'alacritty.toml',
      'kitty.conf',
      'iterm2.itermcolors',
      'warp.yaml',
      'hyper.js',
      'vscode.json',
      'neovim.lua',
      'raycast.json',
      'bat.conf',
      'delta.gitconfig',
      'starship.toml',
      'zsh-theme.zsh'
    ];

    let allFilesExist = true;
    const missingFiles = [];

    for (const configFile of expectedConfigFiles) {
      const filePath = path.join(testThemeDir, configFile);
      if (!fs.existsSync(filePath)) {
        allFilesExist = false;
        missingFiles.push(configFile);
      }
    }

    if (allFilesExist) {
      logTest('All 12 config files generated', true, expectedConfigFiles.join(', '));
    } else {
      logTest('All 12 config files generated', false, `Missing files: ${missingFiles.join(', ')}`);
    }

    // Test 5: Verify theme can be listed
    console.log('\nTest 5: Verifying theme appears in theme list...');
    try {
      const themes = await win.webContents.executeJavaScript(`
        window.electronAPI.listThemes()
      `);

      const createdTheme = themes.find(t => t.name === testThemeDirName);

      if (createdTheme) {
        logTest('Created theme appears in theme list', true, `Found theme: ${createdTheme.name}`);

        // Verify it's marked as custom
        if (createdTheme.isCustom === true) {
          logTest('Theme correctly marked as custom', true);
        } else {
          logTest('Theme correctly marked as custom', false, `isCustom = ${createdTheme.isCustom}`);
        }
      } else {
        logTest('Created theme appears in theme list', false, `Theme ${testThemeDirName} not found in list`);
      }
    } catch (err) {
      logTest('Theme list retrieval', false, err.message);
    }

    // Test 6: Verify theme can be retrieved by name
    console.log('\nTest 6: Verifying theme can be retrieved...');
    try {
      const theme = await win.webContents.executeJavaScript(`
        window.electronAPI.getTheme('${testThemeDirName}')
      `);

      if (theme && theme.name === testThemeDirName) {
        logTest('Theme can be retrieved by name', true, `Retrieved: ${theme.name}`);
      } else {
        logTest('Theme can be retrieved by name', false, theme ? `Got ${theme.name}` : 'Theme not found');
      }
    } catch (err) {
      logTest('Theme retrieval', false, err.message);
    }

    // Test 7: Verify duplicate theme name is rejected
    console.log('\nTest 7: Testing error handling for duplicate theme...');
    try {
      await win.webContents.executeJavaScript(`
        window.electronAPI.createTheme(${JSON.stringify(themeData)})
      `);

      // If we get here without error, the test failed
      logTest('Error handling for duplicate theme', false, 'Should have thrown an error');
    } catch (err) {
      // Expected to fail
      if (err.message.includes('already exists') || err.message.includes('exists')) {
        logTest('Error handling for duplicate theme', true, 'Correctly threw error: ' + err.message);
      } else {
        logTest('Error handling for duplicate theme', false, 'Wrong error message: ' + err.message);
      }
    }

    // Clean up: Delete the test theme
    console.log('\nCleanup: Removing test theme...');
    try {
      if (fs.existsSync(testThemeDir)) {
        fs.rmSync(testThemeDir, { recursive: true, force: true });
        console.log('✓ Test theme removed\n');
      }
    } catch (err) {
      console.log('⚠️  Failed to clean up test theme:', err.message, '\n');
    }

    // Print summary
    console.log('=================================');
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
