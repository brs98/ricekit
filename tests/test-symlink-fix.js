#!/usr/bin/env node

/**
 * Test the symlink fix by simulating app initialization
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Symlink Fix\n');

// Import the functions from the compiled JavaScript
const { initializeApp, initializeAppAfterThemes, ensureThemeSymlink } = require('./dist/main/directories');

const RICEKIT_DIR = path.join(require('os').homedir(), 'Library/Application Support/Ricekit');
const CURRENT_DIR = path.join(RICEKIT_DIR, 'current');
const SYMLINK_PATH = path.join(CURRENT_DIR, 'theme');

console.log('Step 1: Check initial state');
console.log(`Symlink exists: ${fs.existsSync(SYMLINK_PATH)}`);

if (fs.existsSync(SYMLINK_PATH)) {
  console.log('⚠️  Symlink already exists. Removing it to test fix...');
  fs.unlinkSync(SYMLINK_PATH);
  console.log('✓ Removed existing symlink\n');
}

console.log('Step 2: Simulate app initialization');
console.log('Running ensureThemeSymlink()...\n');

try {
  ensureThemeSymlink();

  console.log('\nStep 3: Verify symlink was created');

  if (fs.existsSync(SYMLINK_PATH)) {
    const stats = fs.lstatSync(SYMLINK_PATH);
    if (stats.isSymbolicLink()) {
      const target = fs.readlinkSync(SYMLINK_PATH);
      console.log(`✅ SUCCESS: Symlink created!`);
      console.log(`   Path: ${SYMLINK_PATH}`);
      console.log(`   Target: ${target}`);

      // Verify target exists
      if (fs.existsSync(target)) {
        console.log(`   Target exists: ✓`);

        // Check for theme.json
        const themeJsonPath = path.join(target, 'theme.json');
        if (fs.existsSync(themeJsonPath)) {
          const themeData = JSON.parse(fs.readFileSync(themeJsonPath, 'utf8'));
          console.log(`   Theme: ${themeData.name}`);
        }

        console.log('\n🎉 Symlink fix is working correctly!\n');
      } else {
        console.log(`   ❌ Target does not exist!`);
        process.exit(1);
      }
    } else {
      console.log(`❌ FAIL: Path exists but is not a symlink`);
      process.exit(1);
    }
  } else {
    console.log(`❌ FAIL: Symlink was not created`);
    process.exit(1);
  }
} catch (error) {
  console.error(`❌ ERROR: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
}
