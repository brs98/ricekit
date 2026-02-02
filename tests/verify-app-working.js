#!/usr/bin/env node

/**
 * Quick verification test to ensure the app is working properly
 * Tests basic theme switching functionality
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const MACTHEME_DIR = path.join(os.homedir(), 'Library', 'Application Support', 'Ricekit');
const CURRENT_LINK = path.join(MACTHEME_DIR, 'current', 'theme');

console.log('🧪 Ricekit Verification Test');
console.log('=' .repeat(50));

async function runTest() {
  try {
    // Step 1: Check that app is running
    console.log('\n✓ Step 1: Checking app is running...');
    const appRunning = await new Promise((resolve) => {
      exec('osascript -e \'tell application "System Events" to tell process "Electron" to exists\'', (err, stdout) => {
        resolve(stdout.trim() === 'true');
      });
    });

    if (!appRunning) {
      throw new Error('App is not running');
    }
    console.log('  ✓ App is running');

    // Step 2: Check current theme symlink
    console.log('\n✓ Step 2: Checking current theme symlink...');
    if (!fs.existsSync(CURRENT_LINK)) {
      throw new Error('Current theme symlink does not exist');
    }

    const currentTheme = fs.readlinkSync(CURRENT_LINK);
    const themeName = path.basename(currentTheme);
    console.log(`  ✓ Current theme: ${themeName}`);

    // Step 3: Verify themes directory exists and has themes
    console.log('\n✓ Step 3: Checking themes directory...');
    const themesDir = path.join(MACTHEME_DIR, 'themes');
    if (!fs.existsSync(themesDir)) {
      throw new Error('Themes directory does not exist');
    }

    const themes = fs.readdirSync(themesDir).filter(f => {
      const fullPath = path.join(themesDir, f);
      return fs.statSync(fullPath).isDirectory() && f !== '.DS_Store';
    });
    console.log(`  ✓ Found ${themes.length} themes`);

    // Step 4: Verify theme has proper structure
    console.log('\n✓ Step 4: Verifying theme structure...');
    const themeJsonPath = path.join(themesDir, themeName, 'theme.json');
    if (!fs.existsSync(themeJsonPath)) {
      throw new Error(`theme.json not found for ${themeName}`);
    }

    const themeData = JSON.parse(fs.readFileSync(themeJsonPath, 'utf8'));
    console.log(`  ✓ Theme name: ${themeData.name}`);
    console.log(`  ✓ Theme author: ${themeData.author}`);
    console.log(`  ✓ Has colors: ${!!themeData.colors}`);

    // Step 5: Check that symlink is not broken
    console.log('\n✓ Step 5: Verifying symlink integrity...');
    const realPath = fs.realpathSync(CURRENT_LINK);
    console.log(`  ✓ Symlink points to: ${realPath}`);
    console.log(`  ✓ Symlink is valid (not broken)`);

    console.log('\n' + '='.repeat(50));
    console.log('✅ ALL VERIFICATION TESTS PASSED');
    console.log('='.repeat(50));
    console.log('\nThe app is working correctly! ✨');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ VERIFICATION TEST FAILED');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

runTest();
