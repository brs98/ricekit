/**
 * VERIFICATION TEST - Core Functionality
 * Tests that previously passing features still work
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('=================================');
console.log('🔍 VERIFICATION TEST - Core Features');
console.log('=================================\n');

// Test 1: Check directory structure
console.log('Test 1: Directory Structure');
const baseDir = path.join(os.homedir(), 'Library', 'Application Support', 'Ricekit');
const dirs = [
  path.join(baseDir, 'themes'),
  path.join(baseDir, 'custom-themes'),
  path.join(baseDir, 'current')
];

let passed = 0;
let failed = 0;

dirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`  ✅ ${path.basename(dir)} directory exists`);
    passed++;
  } else {
    console.log(`  ❌ ${path.basename(dir)} directory NOT found`);
    failed++;
  }
});

// Test 2: Check bundled themes
console.log('\nTest 2: Bundled Themes');
const themesDir = path.join(baseDir, 'themes');
const expectedThemes = [
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

if (fs.existsSync(themesDir)) {
  const themes = fs.readdirSync(themesDir).filter(f => {
    const stat = fs.statSync(path.join(themesDir, f));
    return stat.isDirectory() && !f.startsWith('.');
  });

  console.log(`  Found ${themes.length} themes`);

  expectedThemes.forEach(theme => {
    if (themes.includes(theme)) {
      console.log(`  ✅ ${theme}`);
      passed++;
    } else {
      console.log(`  ❌ ${theme} NOT found`);
      failed++;
    }
  });
} else {
  console.log('  ❌ Themes directory not found');
  failed += expectedThemes.length;
}

// Test 3: Check theme metadata
console.log('\nTest 3: Theme Metadata Files');
if (fs.existsSync(themesDir)) {
  const themes = fs.readdirSync(themesDir).filter(f => {
    const stat = fs.statSync(path.join(themesDir, f));
    return stat.isDirectory() && !f.startsWith('.');
  });

  themes.slice(0, 3).forEach(theme => {
    const themeJsonPath = path.join(themesDir, theme, 'theme.json');
    if (fs.existsSync(themeJsonPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(themeJsonPath, 'utf-8'));
        if (data.name && data.colors) {
          console.log(`  ✅ ${theme}/theme.json valid`);
          passed++;
        } else {
          console.log(`  ❌ ${theme}/theme.json missing required fields`);
          failed++;
        }
      } catch (err) {
        console.log(`  ❌ ${theme}/theme.json invalid JSON`);
        failed++;
      }
    } else {
      console.log(`  ❌ ${theme}/theme.json NOT found`);
      failed++;
    }
  });
}

// Test 4: Check preferences file
console.log('\nTest 4: Preferences File');
const prefsPath = path.join(baseDir, 'preferences.json');
if (fs.existsSync(prefsPath)) {
  try {
    const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf-8'));
    if (prefs.favorites !== undefined && prefs.recentThemes !== undefined) {
      console.log('  ✅ preferences.json valid');
      passed++;
    } else {
      console.log('  ❌ preferences.json missing required fields');
      failed++;
    }
  } catch (err) {
    console.log('  ❌ preferences.json invalid JSON');
    failed++;
  }
} else {
  console.log('  ❌ preferences.json NOT found');
  failed++;
}

// Test 5: Check current symlink
console.log('\nTest 5: Current Theme Symlink');
const symlinkPath = path.join(baseDir, 'current', 'theme');
if (fs.existsSync(symlinkPath)) {
  try {
    const target = fs.readlinkSync(symlinkPath);
    console.log(`  ✅ Symlink exists, points to: ${path.basename(path.dirname(target))}/${path.basename(target)}`);
    passed++;
  } catch (err) {
    console.log('  ❌ Symlink exists but cannot be read');
    failed++;
  }
} else {
  console.log('  ⚠️  Symlink not yet created (theme not applied yet - OK)');
}

// Summary
console.log('\n=================================');
console.log('VERIFICATION RESULTS');
console.log('=================================');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log('=================================\n');

if (failed > 0) {
  console.log('❌ VERIFICATION FAILED - Previous features are broken!');
  console.log('⚠️  Do not proceed with new features until these are fixed.\n');
  process.exit(1);
} else {
  console.log('✅ VERIFICATION PASSED - Core features working correctly');
  console.log('✓ Safe to proceed with new feature implementation\n');
  process.exit(0);
}
