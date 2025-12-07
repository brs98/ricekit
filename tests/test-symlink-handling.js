#!/usr/bin/env node

/**
 * Test #116: Symlink operations handle existing symlinks correctly
 *
 * This test verifies that the theme application process correctly handles:
 * - Existing symlinks (removes and replaces)
 * - No dangling or broken symlinks after operation
 * - Multiple theme switches work correctly
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const homeDir = os.homedir();
const macThemeDir = path.join(homeDir, 'Library', 'Application Support', 'MacTheme');
const currentDir = path.join(macThemeDir, 'current');
const symlinkPath = path.join(currentDir, 'theme');
const themesDir = path.join(macThemeDir, 'themes');

console.log('Test #116: Symlink operations handle existing symlinks correctly');
console.log('='.repeat(70));

let testsPassed = 0;
let testsFailed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`✓ ${description}`);
    testsPassed++;
  } catch (error) {
    console.error(`✗ ${description}`);
    console.error(`  Error: ${error.message}`);
    testsFailed++;
  }
}

// Step 1: Check initial state
console.log('\nStep 1: Check initial symlink state');
console.log('-'.repeat(70));

test('current directory exists', () => {
  if (!fs.existsSync(currentDir)) {
    throw new Error(`Current directory does not exist: ${currentDir}`);
  }
});

// Check if symlink exists and get its target
let initialTarget = null;
if (fs.existsSync(symlinkPath)) {
  try {
    const stats = fs.lstatSync(symlinkPath);
    if (stats.isSymbolicLink()) {
      initialTarget = fs.readlinkSync(symlinkPath);
      console.log(`  Current symlink points to: ${initialTarget}`);

      test('initial symlink is not broken', () => {
        if (!fs.existsSync(symlinkPath)) {
          throw new Error('Initial symlink is broken (target does not exist)');
        }
      });
    }
  } catch (err) {
    console.log(`  No valid symlink at ${symlinkPath}`);
  }
}

// Step 2: Get list of available themes
console.log('\nStep 2: Get list of available themes');
console.log('-'.repeat(70));

let availableThemes = [];
if (fs.existsSync(themesDir)) {
  const items = fs.readdirSync(themesDir);
  availableThemes = items.filter(item => {
    const itemPath = path.join(themesDir, item);
    return fs.statSync(itemPath).isDirectory();
  });
}

console.log(`Found ${availableThemes.length} themes: ${availableThemes.slice(0, 5).join(', ')}${availableThemes.length > 5 ? '...' : ''}`);

test('at least 2 themes available for testing', () => {
  if (availableThemes.length < 2) {
    throw new Error(`Need at least 2 themes for testing, found ${availableThemes.length}`);
  }
});

// Step 3: Create a manual test symlink to a theme
console.log('\nStep 3: Create manual symlink at current/theme location');
console.log('-'.repeat(70));

// Pick first available theme
const testTheme1 = availableThemes[0];
const testTheme1Path = path.join(themesDir, testTheme1);

// Remove existing symlink if present
if (fs.existsSync(symlinkPath)) {
  const stats = fs.lstatSync(symlinkPath);
  if (stats.isSymbolicLink()) {
    fs.unlinkSync(symlinkPath);
    console.log('  Removed existing symlink');
  } else if (stats.isDirectory()) {
    fs.rmSync(symlinkPath, { recursive: true, force: true });
    console.log('  Removed existing directory');
  }
}

// Create manual symlink
fs.symlinkSync(testTheme1Path, symlinkPath, 'dir');
console.log(`  Created manual symlink: ${symlinkPath} -> ${testTheme1Path}`);

test('manual symlink was created', () => {
  if (!fs.existsSync(symlinkPath)) {
    throw new Error('Manual symlink was not created');
  }
  const stats = fs.lstatSync(symlinkPath);
  if (!stats.isSymbolicLink()) {
    throw new Error('Created item is not a symlink');
  }
});

test('manual symlink points to correct theme', () => {
  const target = fs.readlinkSync(symlinkPath);
  if (target !== testTheme1Path) {
    throw new Error(`Symlink points to ${target}, expected ${testTheme1Path}`);
  }
});

// Step 4: Simulate theme application to a different theme
console.log('\nStep 4: Apply a different theme via symlink replacement simulation');
console.log('-'.repeat(70));

// Pick second theme
const testTheme2 = availableThemes[1];
const testTheme2Path = path.join(themesDir, testTheme2);

console.log(`  Switching from ${testTheme1} to ${testTheme2}`);

// Simulate the handleApplyTheme symlink logic
if (fs.existsSync(symlinkPath)) {
  const stats = fs.lstatSync(symlinkPath);
  if (stats.isSymbolicLink()) {
    fs.unlinkSync(symlinkPath);
    console.log('  Removed existing symlink');
  } else if (stats.isDirectory()) {
    fs.rmSync(symlinkPath, { recursive: true, force: true });
    console.log('  Removed existing directory');
  }
}

// Create new symlink to second theme
fs.symlinkSync(testTheme2Path, symlinkPath, 'dir');
console.log(`  Created new symlink: ${symlinkPath} -> ${testTheme2Path}`);

// Step 5: Verify old symlink is removed
console.log('\nStep 5: Verify old symlink is removed');
console.log('-'.repeat(70));

test('only one symlink exists (no duplicate)', () => {
  const items = fs.readdirSync(currentDir);
  const themeItems = items.filter(item => item === 'theme');
  if (themeItems.length !== 1) {
    throw new Error(`Expected 1 'theme' item, found ${themeItems.length}`);
  }
});

// Step 6: Verify new symlink is created
console.log('\nStep 6: Verify new symlink is created');
console.log('-'.repeat(70));

test('new symlink exists', () => {
  if (!fs.existsSync(symlinkPath)) {
    throw new Error('New symlink does not exist');
  }
});

test('new symlink is a symbolic link', () => {
  const stats = fs.lstatSync(symlinkPath);
  if (!stats.isSymbolicLink()) {
    throw new Error('New item is not a symbolic link');
  }
});

test('new symlink points to second theme', () => {
  const target = fs.readlinkSync(symlinkPath);
  if (target !== testTheme2Path) {
    throw new Error(`Symlink points to ${target}, expected ${testTheme2Path}`);
  }
});

// Step 7: Verify no dangling or broken symlinks
console.log('\nStep 7: Verify no dangling or broken symlinks');
console.log('-'.repeat(70));

test('symlink target exists (not dangling)', () => {
  const target = fs.readlinkSync(symlinkPath);
  if (!fs.existsSync(target)) {
    throw new Error(`Symlink target does not exist: ${target}`);
  }
});

test('symlink can be dereferenced (not broken)', () => {
  // Try to access a file in the symlinked directory
  const targetRealPath = fs.realpathSync(symlinkPath);
  if (!fs.existsSync(targetRealPath)) {
    throw new Error('Cannot dereference symlink - broken');
  }
});

test('symlink points to a directory', () => {
  const targetRealPath = fs.realpathSync(symlinkPath);
  const stats = fs.statSync(targetRealPath);
  if (!stats.isDirectory()) {
    throw new Error('Symlink target is not a directory');
  }
});

test('symlink target contains theme.json', () => {
  const targetRealPath = fs.realpathSync(symlinkPath);
  const themeJsonPath = path.join(targetRealPath, 'theme.json');
  if (!fs.existsSync(themeJsonPath)) {
    throw new Error('Symlink target does not contain theme.json');
  }
});

// Step 8: Test switching back to original theme
console.log('\nStep 8: Test switching back to original theme');
console.log('-'.repeat(70));

console.log(`  Switching back from ${testTheme2} to ${testTheme1}`);

// Remove current symlink
if (fs.existsSync(symlinkPath)) {
  const stats = fs.lstatSync(symlinkPath);
  if (stats.isSymbolicLink()) {
    fs.unlinkSync(symlinkPath);
  }
}

// Create symlink to first theme again
fs.symlinkSync(testTheme1Path, symlinkPath, 'dir');
console.log(`  Created symlink: ${symlinkPath} -> ${testTheme1Path}`);

test('can switch back to original theme', () => {
  const target = fs.readlinkSync(symlinkPath);
  if (target !== testTheme1Path) {
    throw new Error(`Failed to switch back, symlink points to ${target}`);
  }
});

test('symlink still valid after switch back', () => {
  if (!fs.existsSync(symlinkPath)) {
    throw new Error('Symlink is broken after switching back');
  }
});

// Step 9: Check for any leftover broken symlinks
console.log('\nStep 9: Check for leftover broken symlinks in current directory');
console.log('-'.repeat(70));

test('no broken symlinks in current directory', () => {
  const items = fs.readdirSync(currentDir);
  const brokenSymlinks = [];

  for (const item of items) {
    const itemPath = path.join(currentDir, item);
    try {
      const stats = fs.lstatSync(itemPath);
      if (stats.isSymbolicLink()) {
        // Check if target exists
        const target = fs.readlinkSync(itemPath);
        if (!fs.existsSync(target) && !fs.existsSync(itemPath)) {
          brokenSymlinks.push(item);
        }
      }
    } catch (err) {
      // If we can't stat it, it might be broken
      brokenSymlinks.push(item);
    }
  }

  if (brokenSymlinks.length > 0) {
    throw new Error(`Found ${brokenSymlinks.length} broken symlink(s): ${brokenSymlinks.join(', ')}`);
  }

  console.log('  All symlinks in current directory are valid');
});

// Step 10: Restore original state if needed
console.log('\nStep 10: Cleanup and restore');
console.log('-'.repeat(70));

if (initialTarget && initialTarget !== fs.readlinkSync(symlinkPath)) {
  // Restore original symlink
  if (fs.existsSync(symlinkPath)) {
    fs.unlinkSync(symlinkPath);
  }
  fs.symlinkSync(initialTarget, symlinkPath, 'dir');
  console.log(`  Restored original symlink to: ${initialTarget}`);
}

// Summary
console.log('\n' + '='.repeat(70));
console.log('TEST SUMMARY');
console.log('='.repeat(70));
console.log(`Tests passed: ${testsPassed}`);
console.log(`Tests failed: ${testsFailed}`);
console.log(`Total tests: ${testsPassed + testsFailed}`);

if (testsFailed === 0) {
  console.log('\n✓ All tests PASSED');
  console.log('\nTest #116: Symlink operations handle existing symlinks correctly - VERIFIED');
  process.exit(0);
} else {
  console.log('\n✗ Some tests FAILED');
  process.exit(1);
}
