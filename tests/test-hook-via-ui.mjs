/**
 * Test hook script execution by applying a theme through the UI with Puppeteer
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import puppeteer from 'puppeteer';

console.log('=== Testing Hook Script via UI ===\n');

// Path to hook log file
const logPath = path.join(os.homedir(), 'Library/Application Support/MacTheme/hook-log.txt');

// Clear any previous log
if (fs.existsSync(logPath)) {
  fs.unlinkSync(logPath);
  console.log('✓ Cleared previous hook log\n');
}

// Verify preferences
const prefsPath = path.join(os.homedir(), 'Library/Application Support/MacTheme/preferences.json');
const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf-8'));

console.log('Hook script configured:', prefs.hookScript || 'NOT CONFIGURED');

if (!prefs.hookScript) {
  console.log('\n❌ FAILED: Hook script not configured');
  process.exit(1);
}

console.log('✓ Prerequisites met\n');
console.log('=== Launching Browser to Connect to App ===\n');

try {
  // Connect to the Electron app's debug port
  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:5173',
    defaultViewport: null
  });

  console.log('✓ Connected to app\n');

  const pages = await browser.pages();
  const page = pages[0];

  // Wait for app to load
  await page.waitForSelector('[data-theme-card]', { timeout: 10000 });

  console.log('✓ App loaded, themes visible\n');
  console.log('=== Clicking on first theme ===\n');

  // Click on the first theme card
  await page.click('[data-theme-card]');

  console.log('✓ Theme clicked, waiting for application...\n');

  // Wait a moment for theme application
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Check if hook was executed
  if (fs.existsSync(logPath)) {
    const logContent = fs.readFileSync(logPath, 'utf-8');
    console.log('=== Hook Log Content ===');
    console.log(logContent);

    if (logContent.includes('Hook script executed') && logContent.includes('Theme applied:')) {
      console.log('\n✅ SUCCESS: Hook script executed correctly!');
      browser.disconnect();
      process.exit(0);
    } else {
      console.log('\n❌ FAILED: Hook log missing expected content');
      browser.disconnect();
      process.exit(1);
    }
  } else {
    console.log('\n❌ FAILED: Hook script was not executed (no log file)');
    browser.disconnect();
    process.exit(1);
  }
} catch (error) {
  console.error('\n❌ ERROR:', error.message);
  process.exit(1);
}
