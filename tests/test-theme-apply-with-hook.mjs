/**
 * Test theme application with hook script
 * This simulates applying a theme through IPC
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';

console.log('=== Testing Theme Application with Hook Script ===\n');

// Path to hook log file
const logPath = path.join(os.homedir(), 'Library/Application Support/Ricekit/hook-log.txt');

// Clear any previous log
if (fs.existsSync(logPath)) {
  fs.unlinkSync(logPath);
  console.log('✓ Cleared previous hook log\n');
}

// Verify hook script is configured
const prefsPath = path.join(os.homedir(), 'Library/Application Support/Ricekit/preferences.json');
const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf-8'));

console.log('Hook script configured:', prefs.hookScript || 'NOT CONFIGURED');

if (!prefs.hookScript) {
  console.log('\n❌ FAILED: Hook script not configured');
  process.exit(1);
}

console.log('\n=== Manual Test Instructions ===');
console.log('1. The Ricekit app should be running');
console.log('2. Open the app window');
console.log('3. Click on any theme card to apply it');
console.log('4. Wait a moment for the theme to apply');
console.log('5. Check if the hook log was created:');
console.log(`   cat "${logPath}"`);
console.log('\n=== Automated Check (60 second timeout) ===\n');

// Poll for log file creation
let attempts = 0;
const maxAttempts = 60;

const checkInterval = setInterval(() => {
  attempts++;

  if (fs.existsSync(logPath)) {
    clearInterval(checkInterval);
    const logContent = fs.readFileSync(logPath, 'utf-8');
    console.log('\n✅ Hook log file created!');
    console.log('\n=== Hook Log Content ===');
    console.log(logContent);

    // Verify log contains expected content
    if (logContent.includes('Hook script executed') && logContent.includes('Theme applied:')) {
      console.log('\n✅ SUCCESS: Hook script executed correctly!');
      console.log('✅ Hook script received theme name as argument');
      process.exit(0);
    } else {
      console.log('\n⚠️  WARNING: Log file exists but content is unexpected');
      console.log('Expected: "Hook script executed" and "Theme applied: [theme-name]"');
      process.exit(1);
    }
  } else if (attempts >= maxAttempts) {
    clearInterval(checkInterval);
    console.log('\n⏱️  Timeout: No theme was applied within 60 seconds');
    console.log('\n📝 To manually test:');
    console.log('1. Apply a theme through the Ricekit UI');
    console.log(`2. Run: cat "${logPath}"`);
    console.log('3. Verify it contains the theme name');
    process.exit(1);
  } else if (attempts % 5 === 0) {
    console.log(`⏳ Waiting for theme application... (${attempts}s elapsed)`);
  }
}, 1000);
