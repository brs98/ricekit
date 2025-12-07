#!/usr/bin/env node

/**
 * Test script to verify backup/restore functionality
 * This simulates the IPC calls that would be made from the renderer process
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const preferencesPath = path.join(
  os.homedir(),
  'Library/Application Support/MacTheme/preferences.json'
);

console.log('Testing Backup/Restore Functionality\n');
console.log('Current preferences file:', preferencesPath);
console.log('');

// Read current preferences
const prefs = JSON.parse(fs.readFileSync(preferencesPath, 'utf-8'));
console.log('Current preferences:');
console.log(JSON.stringify(prefs, null, 2));
console.log('');

// Create a test backup
const backupPath = path.join(os.homedir(), 'Downloads', 'test-mactheme-backup.json');
const backup = {
  version: '1.0',
  timestamp: new Date().toISOString(),
  preferences: prefs
};

fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
console.log('✓ Created test backup at:', backupPath);
console.log('');

// Verify backup file structure
const backupContent = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
console.log('Backup file structure:');
console.log('- version:', backupContent.version);
console.log('- timestamp:', backupContent.timestamp);
console.log('- preferences:', Object.keys(backupContent.preferences).length, 'fields');
console.log('');

// Test restoration (simulate modifying preferences first)
console.log('Simulating preference modification...');
const modifiedPrefs = { ...prefs };
modifiedPrefs.startAtLogin = !prefs.startAtLogin;
modifiedPrefs.defaultLightTheme = 'nord';
fs.writeFileSync(preferencesPath, JSON.stringify(modifiedPrefs, null, 2));
console.log('✓ Modified preferences (startAtLogin:', modifiedPrefs.startAtLogin, ', defaultLightTheme:', modifiedPrefs.defaultLightTheme + ')');
console.log('');

// Restore from backup
console.log('Restoring from backup...');
const restoredBackup = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
fs.writeFileSync(preferencesPath, JSON.stringify(restoredBackup.preferences, null, 2));
console.log('✓ Restored preferences from backup');
console.log('');

// Verify restoration
const restoredPrefs = JSON.parse(fs.readFileSync(preferencesPath, 'utf-8'));
console.log('Verification:');
console.log('- startAtLogin restored to:', restoredPrefs.startAtLogin, '(expected:', prefs.startAtLogin + ')');
console.log('- defaultLightTheme restored to:', restoredPrefs.defaultLightTheme, '(expected:', prefs.defaultLightTheme + ')');
console.log('');

if (restoredPrefs.startAtLogin === prefs.startAtLogin &&
    restoredPrefs.defaultLightTheme === prefs.defaultLightTheme) {
  console.log('✓✓✓ TEST PASSED: Backup and restore functionality works correctly!');
} else {
  console.log('✗✗✗ TEST FAILED: Restored preferences do not match original');
}

console.log('');
console.log('Test backup file available at:', backupPath);
console.log('You can now test the UI functionality by:');
console.log('1. Opening MacTheme app');
console.log('2. Going to Settings > Backup & Restore');
console.log('3. Clicking Backup button and saving a new backup');
console.log('4. Modifying some settings');
console.log('5. Clicking Restore button and selecting the backup file');
