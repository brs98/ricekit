/**
 * Test theme application with notifications disabled
 */

const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Simple test to apply a theme
async function testThemeApplication() {
  const prefsPath = path.join(os.homedir(), 'Library', 'Application Support', 'MacTheme', 'preferences.json');
  const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf-8'));

  console.log('\n=== Testing Theme Application with Notifications OFF ===\n');
  console.log('Current notification settings:');
  console.log('  onThemeChange:', prefs.notifications?.onThemeChange);
  console.log('  onScheduledSwitch:', prefs.notifications?.onScheduledSwitch);
  console.log();

  console.log('Expected behavior:');
  console.log('  ✓ Theme should still be applied successfully');
  console.log('  ✓ NO notification should appear');
  console.log('  ✓ Symlink should be updated');
  console.log();

  console.log('To test:');
  console.log('1. In the MacTheme app, click on any theme card');
  console.log('2. Click "Apply Theme"');
  console.log('3. Verify NO notification appears');
  console.log('4. Verify theme is still applied (check symlink and UI)');
  console.log();

  // Check current symlink
  const symlinkPath = path.join(os.homedir(), 'Library', 'Application Support', 'MacTheme', 'current', 'theme');
  try {
    const target = fs.readlinkSync(symlinkPath);
    console.log('Current theme symlink points to:', target);
  } catch (err) {
    console.log('Current theme symlink:', 'Not set');
  }
}

testThemeApplication();
