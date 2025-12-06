#!/usr/bin/env node

/**
 * Simple integration test for theme:update functionality
 *
 * Tests the update workflow:
 * 1. Create a test theme
 * 2. Manually update it by regenerating files
 * 3. Verify updated theme files
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Get paths
const homeDir = os.homedir();
const macThemeDir = path.join(homeDir, 'Library', 'Application Support', 'MacTheme');
const customThemesDir = path.join(macThemeDir, 'custom-themes');

// Test theme name
const testThemeName = 'test-update-simple';
const testThemeDir = path.join(customThemesDir, testThemeName);

// Test data
const initialThemeData = {
  name: 'Test Update Simple',
  author: 'Test Author',
  description: 'Initial version',
  version: '1.0.0',
  colors: {
    background: '#1a1b26',
    foreground: '#a9b1d6',
    cursor: '#c0caf5',
    selection: '#33467c',
    black: '#414868',
    red: '#f7768e',
    green: '#9ece6a',
    yellow: '#e0af68',
    blue: '#7aa2f7',
    magenta: '#bb9af7',
    cyan: '#7dcfff',
    white: '#c0caf5',
    brightBlack: '#414868',
    brightRed: '#f7768e',
    brightGreen: '#9ece6a',
    brightYellow: '#e0af68',
    brightBlue: '#7aa2f7',
    brightMagenta: '#bb9af7',
    brightCyan: '#7dcfff',
    brightWhite: '#c0caf5',
    accent: '#7aa2f7',
    border: '#414868'
  }
};

const updatedThemeData = {
  name: 'Test Update Simple (Updated)',
  author: 'Updated Author',
  description: 'Updated version with new colors',
  version: '2.0.0',
  colors: {
    background: '#000000',  // Changed!
    foreground: '#ffffff',  // Changed!
    cursor: '#ff0000',
    selection: '#444444',
    black: '#111111',
    red: '#ff5555',
    green: '#50fa7b',
    yellow: '#f1fa8c',
    blue: '#bd93f9',
    magenta: '#ff79c6',
    cyan: '#8be9fd',
    white: '#bbbbbb',
    brightBlack: '#555555',
    brightRed: '#ff5555',
    brightGreen: '#50fa7b',
    brightYellow: '#f1fa8c',
    brightBlue: '#bd93f9',
    brightMagenta: '#ff79c6',
    brightCyan: '#8be9fd',
    brightWhite: '#ffffff',
    accent: '#bd93f9',
    border: '#333333'
  }
};

// Test results
const results = {
  passed: 0,
  failed: 0,
  errors: []
};

function log(message) {
  console.log(`[TEST] ${message}`);
}

function pass(testName) {
  results.passed++;
  log(`✓ ${testName}`);
}

function fail(testName, error) {
  results.failed++;
  results.errors.push({ test: testName, error });
  log(`✗ ${testName}: ${error}`);
}

function cleanup() {
  if (fs.existsSync(testThemeDir)) {
    fs.rmSync(testThemeDir, { recursive: true, force: true });
    log('Cleaned up test theme');
  }
}

function runTests() {
  log('========================================');
  log('TEST: theme:update Functionality');
  log('========================================\n');

  try {
    // Import the theme installer
    const { generateThemeConfigFiles } = require('./dist/main/themeInstaller.js');

    // Cleanup first
    cleanup();

    // Step 1: Create initial theme
    log('Step 1: Creating initial test theme...');
    generateThemeConfigFiles(testThemeDir, initialThemeData);

    if (fs.existsSync(testThemeDir)) {
      pass('Test theme directory created');
    } else {
      fail('Test theme directory created', 'Directory not found');
      process.exit(1);
    }

    // Step 2: Verify initial theme.json
    log('\nStep 2: Verifying initial theme.json...');
    const themeJsonPath = path.join(testThemeDir, 'theme.json');
    if (!fs.existsSync(themeJsonPath)) {
      fail('Initial theme.json exists', 'File not found');
      process.exit(1);
    }

    const initialThemeJson = JSON.parse(fs.readFileSync(themeJsonPath, 'utf-8'));
    if (initialThemeJson.name === initialThemeData.name) {
      pass('Initial theme name correct');
    } else {
      fail('Initial theme name correct', `Expected "${initialThemeData.name}", got "${initialThemeJson.name}"`);
    }

    if (initialThemeJson.version === initialThemeData.version) {
      pass('Initial theme version correct');
    } else {
      fail('Initial theme version correct', `Expected "${initialThemeData.version}", got "${initialThemeJson.version}"`);
    }

    if (initialThemeJson.colors.background === initialThemeData.colors.background) {
      pass('Initial background color correct');
    } else {
      fail('Initial background color correct', `Expected "${initialThemeData.colors.background}", got "${initialThemeJson.colors.background}"`);
    }

    // Step 3: Verify all config files exist
    log('\nStep 3: Verifying initial config files...');
    const configFiles = [
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

    let missingFiles = [];
    for (const file of configFiles) {
      const filePath = path.join(testThemeDir, file);
      if (!fs.existsSync(filePath)) {
        missingFiles.push(file);
      }
    }

    if (missingFiles.length === 0) {
      pass(`All ${configFiles.length} config files created`);
    } else {
      fail('All config files created', `Missing: ${missingFiles.join(', ')}`);
    }

    // Step 4: Simulate theme update (remove old files, regenerate with new data)
    log('\nStep 4: Updating theme (simulating theme:update handler)...');

    // Remove all config files
    for (const file of configFiles) {
      const filePath = path.join(testThemeDir, file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Remove theme.json
    if (fs.existsSync(themeJsonPath)) {
      fs.unlinkSync(themeJsonPath);
    }

    // Regenerate with updated data
    generateThemeConfigFiles(testThemeDir, updatedThemeData);
    pass('Theme regenerated with updated data');

    // Step 5: Verify updated theme.json
    log('\nStep 5: Verifying updated theme.json...');
    if (!fs.existsSync(themeJsonPath)) {
      fail('Updated theme.json exists', 'File not found');
      process.exit(1);
    }

    const updatedThemeJson = JSON.parse(fs.readFileSync(themeJsonPath, 'utf-8'));

    if (updatedThemeJson.name === updatedThemeData.name) {
      pass('Updated theme name is correct');
    } else {
      fail('Updated theme name is correct', `Expected "${updatedThemeData.name}", got "${updatedThemeJson.name}"`);
    }

    if (updatedThemeJson.version === updatedThemeData.version) {
      pass('Updated theme version is correct');
    } else {
      fail('Updated theme version is correct', `Expected "${updatedThemeData.version}", got "${updatedThemeJson.version}"`);
    }

    if (updatedThemeJson.author === updatedThemeData.author) {
      pass('Updated author is correct');
    } else {
      fail('Updated author is correct', `Expected "${updatedThemeData.author}", got "${updatedThemeJson.author}"`);
    }

    if (updatedThemeJson.description === updatedThemeData.description) {
      pass('Updated description is correct');
    } else {
      fail('Updated description is correct', `Expected "${updatedThemeData.description}", got "${updatedThemeJson.description}"`);
    }

    // Step 6: Verify colors are updated
    log('\nStep 6: Verifying updated colors...');
    if (updatedThemeJson.colors.background === updatedThemeData.colors.background) {
      pass('Background color updated to #000000');
    } else {
      fail('Background color updated', `Expected "${updatedThemeData.colors.background}", got "${updatedThemeJson.colors.background}"`);
    }

    if (updatedThemeJson.colors.foreground === updatedThemeData.colors.foreground) {
      pass('Foreground color updated to #ffffff');
    } else {
      fail('Foreground color updated', `Expected "${updatedThemeData.colors.foreground}", got "${updatedThemeJson.colors.foreground}"`);
    }

    // Step 7: Verify all config files regenerated
    log('\nStep 7: Verifying config files regenerated...');
    missingFiles = [];
    for (const file of configFiles) {
      const filePath = path.join(testThemeDir, file);
      if (!fs.existsSync(filePath)) {
        missingFiles.push(file);
      }
    }

    if (missingFiles.length === 0) {
      pass(`All ${configFiles.length} config files regenerated`);
    } else {
      fail('All config files regenerated', `Missing: ${missingFiles.join(', ')}`);
    }

    // Step 8: Verify config files contain new colors
    log('\nStep 8: Verifying config files contain new colors...');
    const alacrittyPath = path.join(testThemeDir, 'alacritty.toml');
    const alacrittyContent = fs.readFileSync(alacrittyPath, 'utf-8');

    if (alacrittyContent.includes('#000000')) {
      pass('alacritty.toml contains new background color');
    } else {
      fail('alacritty.toml contains new background color', 'Color not found in file');
    }

    if (alacrittyContent.includes('#ffffff')) {
      pass('alacritty.toml contains new foreground color');
    } else {
      fail('alacritty.toml contains new foreground color', 'Color not found in file');
    }

    // Verify in another config file
    const kittyPath = path.join(testThemeDir, 'kitty.conf');
    const kittyContent = fs.readFileSync(kittyPath, 'utf-8');

    if (kittyContent.includes('#000000') || kittyContent.includes('000000')) {
      pass('kitty.conf contains new colors');
    } else {
      fail('kitty.conf contains new colors', 'Color not found in file');
    }

    // Cleanup
    log('\nStep 9: Cleanup...');
    cleanup();

  } catch (error) {
    fail('Test execution', error.message);
    console.error('\nError details:', error);
  }

  // Summary
  log('\n' + '='.repeat(50));
  log('TEST RESULTS');
  log('='.repeat(50));
  log(`Passed: ${results.passed}/${results.passed + results.failed}`);
  log(`Failed: ${results.failed}/${results.passed + results.failed}`);

  if (results.failed > 0) {
    log('\nFailed tests:');
    results.errors.forEach(({ test, error }) => {
      log(`  - ${test}: ${error}`);
    });
  }

  log('='.repeat(50));

  if (results.failed === 0) {
    log('\n✓ ALL TESTS PASSED');
    process.exit(0);
  } else {
    log('\n✗ SOME TESTS FAILED');
    process.exit(1);
  }
}

// Run the tests
try {
  runTests();
} catch (err) {
  console.error('[TEST] Fatal error:', err);
  process.exit(1);
}
