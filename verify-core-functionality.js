/**
 * Verification Test - Run BEFORE implementing new features
 * Tests core functionality to ensure no regressions from previous sessions
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(60));
console.log('VERIFICATION TEST - Core Functionality Check');
console.log('='.repeat(60));
console.log('');

const appSupportPath = path.join(require('os').homedir(), 'Library/Application Support/MacTheme');

// Test 1: Verify directory structure exists
console.log('Test 1: Directory structure...');
const requiredDirs = ['themes', 'custom-themes', 'current'];
let dirsOk = true;
requiredDirs.forEach(dir => {
  const fullPath = path.join(appSupportPath, dir);
  if (fs.existsSync(fullPath)) {
    console.log(`  ✓ ${dir}/ exists`);
  } else {
    console.log(`  ✗ ${dir}/ missing!`);
    dirsOk = false;
  }
});

// Test 2: Verify bundled themes exist
console.log('\nTest 2: Bundled themes...');
const expectedThemes = [
  'tokyo-night', 'catppuccin-mocha', 'catppuccin-latte',
  'gruvbox-dark', 'gruvbox-light', 'nord', 'dracula',
  'one-dark', 'solarized-dark', 'solarized-light', 'rose-pine'
];
let themesOk = true;
const themesDir = path.join(appSupportPath, 'themes');
if (fs.existsSync(themesDir)) {
  expectedThemes.forEach(theme => {
    const themePath = path.join(themesDir, theme);
    const themeJsonPath = path.join(themePath, 'theme.json');
    if (fs.existsSync(themeJsonPath)) {
      console.log(`  ✓ ${theme}`);
    } else {
      console.log(`  ✗ ${theme} missing!`);
      themesOk = false;
    }
  });
}

// Test 3: Verify preferences.json is valid
console.log('\nTest 3: Preferences file...');
const prefsPath = path.join(appSupportPath, 'preferences.json');
let prefsOk = false;
if (fs.existsSync(prefsPath)) {
  try {
    const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
    console.log('  ✓ preferences.json exists and is valid JSON');
    console.log(`  ✓ Has keys: ${Object.keys(prefs).slice(0, 5).join(', ')}...`);
    prefsOk = true;
  } catch (err) {
    console.log(`  ✗ preferences.json parse error: ${err.message}`);
  }
} else {
  console.log('  ✗ preferences.json missing!');
}

// Test 4: Verify state.json is valid
console.log('\nTest 4: State file...');
const statePath = path.join(appSupportPath, 'state.json');
let stateOk = false;
if (fs.existsSync(statePath)) {
  try {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    console.log('  ✓ state.json exists and is valid JSON');
    console.log(`  ✓ Current theme: ${state.currentTheme || 'none'}`);
    stateOk = true;
  } catch (err) {
    console.log(`  ✗ state.json parse error: ${err.message}`);
  }
} else {
  console.log('  ✗ state.json missing!');
}

// Test 5: Verify symlink exists (if theme has been applied)
console.log('\nTest 5: Theme symlink...');
const symlinkPath = path.join(appSupportPath, 'current/theme');
let symlinkOk = false;
if (fs.existsSync(symlinkPath)) {
  try {
    const linkTarget = fs.readlinkSync(symlinkPath);
    console.log('  ✓ current/theme symlink exists');
    console.log(`  ✓ Points to: ${linkTarget}`);
    // Verify it's not a broken symlink
    const realPath = fs.realpathSync(symlinkPath);
    console.log(`  ✓ Resolves to: ${realPath}`);
    symlinkOk = true;
  } catch (err) {
    console.log(`  ✗ Symlink issue: ${err.message}`);
  }
} else {
  console.log('  ⚠ current/theme symlink does not exist yet (ok if no theme applied)');
  symlinkOk = true; // Not an error if no theme has been applied
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('SUMMARY');
console.log('='.repeat(60));
const allOk = dirsOk && themesOk && prefsOk && stateOk && symlinkOk;
if (allOk) {
  console.log('✅ ALL CORE FUNCTIONALITY CHECKS PASSED');
  console.log('   Safe to proceed with new feature implementation.');
} else {
  console.log('❌ SOME CHECKS FAILED - DO NOT PROCEED');
  console.log('   Fix these issues before implementing new features!');
}
console.log('='.repeat(60));

process.exit(allOk ? 0 : 1);
