/**
 * Test hook script execution by applying a theme through the UI
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

console.log('=== Testing Hook Script Execution ===\n');

// Path to hook log file
const logPath = path.join(os.homedir(), 'Library/Application Support/Ricekit/hook-log.txt');

// Clear any previous log
if (fs.existsSync(logPath)) {
  fs.unlinkSync(logPath);
  console.log('✓ Cleared previous hook log\n');
}

// Path to preferences
const prefsPath = path.join(os.homedir(), 'Library/Application Support/Ricekit/preferences.json');

// Verify preferences has hook script configured
console.log('=== Checking Preferences ===');
const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf-8'));
console.log('Hook script path:', prefs.hookScript || 'NOT CONFIGURED');

if (!prefs.hookScript) {
  console.log('\n❌ FAILED: Hook script not configured in preferences');
  process.exit(1);
}

// Verify hook script exists
const hookPath = prefs.hookScript.startsWith('~')
  ? path.join(os.homedir(), prefs.hookScript.slice(1))
  : prefs.hookScript;

console.log('Expanded hook path:', hookPath);
console.log('Hook script exists:', fs.existsSync(hookPath));

if (!fs.existsSync(hookPath)) {
  console.log('\n❌ FAILED: Hook script file not found');
  process.exit(1);
}

// Check if executable
try {
  fs.accessSync(hookPath, fs.constants.X_OK);
  console.log('Hook script is executable: ✓');
} catch (err) {
  console.log('\n❌ FAILED: Hook script is not executable');
  process.exit(1);
}

console.log('\n=== Prerequisites Met ===');
console.log('✓ Preferences configured with hook script path');
console.log('✓ Hook script file exists');
console.log('✓ Hook script is executable');
console.log('\n=== Manual Testing Steps ===');
console.log('1. The app is already running');
console.log('2. Apply any theme through the UI');
console.log('3. Check the hook log file:');
console.log(`   cat "${logPath}"`);
console.log('4. Expected: Log file should contain theme name and timestamp');
console.log('\n=== Automated Test ===');
console.log('Simulating theme application via IPC...');

// We need to trigger the IPC handler directly since we can't easily interact with the UI
// Let's create a simpler test that directly calls the handler
import { exec } from 'child_process';

// Use osascript to trigger a theme change via AppleScript if possible
// Or we can just manually test through the UI

console.log('\nTo complete the test:');
console.log('1. Click on any theme in the Ricekit app');
console.log('2. Run this command to check the log:');
console.log(`   cat "${logPath}"`);
console.log('\n⏳ Waiting for manual theme application...');
console.log('Press Ctrl+C when done testing\n');

// Poll for log file creation
let attempts = 0;
const maxAttempts = 60; // Wait up to 60 seconds

const checkInterval = setInterval(() => {
  attempts++;

  if (fs.existsSync(logPath)) {
    clearInterval(checkInterval);
    const logContent = fs.readFileSync(logPath, 'utf-8');
    console.log('\n=== Hook Log Found! ===');
    console.log(logContent);

    if (logContent.includes('Hook script executed') && logContent.includes('Theme applied:')) {
      console.log('\n✅ SUCCESS: Hook script executed correctly!');
      process.exit(0);
    } else {
      console.log('\n⚠️  WARNING: Log file exists but content is unexpected');
      process.exit(1);
    }
  } else if (attempts >= maxAttempts) {
    clearInterval(checkInterval);
    console.log('\n⏱️  Timeout: No theme application detected within 60 seconds');
    console.log('Please apply a theme manually through the UI');
    process.exit(1);
  } else if (attempts % 10 === 0) {
    console.log(`⏳ Still waiting... (${attempts}s elapsed)`);
  }
}, 1000);
