/**
 * Test script to verify theme application and recent themes tracking
 */

const fs = require('fs');
const path = require('path');

const ricekitDir = path.join(process.env.HOME, 'Library/Application Support/Ricekit');
const prefsPath = path.join(ricekitDir, 'preferences.json');
const statePath = path.join(ricekitDir, 'state.json');

console.log('='.repeat(60));
console.log('Ricekit Application Test');
console.log('='.repeat(60));
console.log();

// Check if directories exist
console.log('1. Checking Ricekit directories...');
console.log(`   Ricekit dir: ${fs.existsSync(ricekitDir) ? '✓' : '✗'}`);
console.log(`   Preferences: ${fs.existsSync(prefsPath) ? '✓' : '✗'}`);
console.log(`   State: ${fs.existsSync(statePath) ? '✓' : '✗'}`);
console.log();

// Read current state
if (fs.existsSync(statePath)) {
  console.log('2. Current State:');
  const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  console.log(`   Current theme: ${state.currentTheme || 'none'}`);
  if (state.lastSwitched) {
    console.log(`   Last switched: ${new Date(state.lastSwitched).toLocaleString()}`);
  }
  console.log();
}

// Read preferences
if (fs.existsSync(prefsPath)) {
  console.log('3. Preferences:');
  const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf-8'));
  console.log(`   Recent themes (${prefs.recentThemes?.length || 0}):`);
  if (prefs.recentThemes && prefs.recentThemes.length > 0) {
    prefs.recentThemes.forEach((theme, index) => {
      console.log(`     ${index + 1}. ${theme}`);
    });
  } else {
    console.log('     (none yet - apply a theme to populate this)');
  }
  console.log();

  console.log(`   Favorites (${prefs.favorites?.length || 0}):`);
  if (prefs.favorites && prefs.favorites.length > 0) {
    prefs.favorites.forEach((theme, index) => {
      console.log(`     ${index + 1}. ${theme}`);
    });
  } else {
    console.log('     (none yet)');
  }
  console.log();
}

// Check symlink
const currentDir = path.join(ricekitDir, 'current');
const symlinkPath = path.join(currentDir, 'theme');

console.log('4. Symlink Status:');
if (fs.existsSync(symlinkPath)) {
  try {
    const stats = fs.lstatSync(symlinkPath);
    if (stats.isSymbolicLink()) {
      const target = fs.readlinkSync(symlinkPath);
      console.log(`   ✓ Symlink exists: ${symlinkPath}`);
      console.log(`   → Points to: ${target}`);
      const themeName = path.basename(target);
      console.log(`   → Theme: ${themeName}`);
    } else {
      console.log(`   ✗ Path exists but is not a symlink`);
    }
  } catch (err) {
    console.log(`   ✗ Error reading symlink: ${err.message}`);
  }
} else {
  console.log(`   ✗ Symlink does not exist yet`);
  console.log(`     (Apply a theme through the app to create it)`);
}
console.log();

console.log('='.repeat(60));
console.log('Test Complete');
console.log('='.repeat(60));
console.log();
console.log('Next steps:');
console.log('1. Launch the app: npm run dev');
console.log('2. Apply 2-3 themes through the UI');
console.log('3. Run this script again to verify recent themes tracking');
console.log();
