/**
 * Direct IPC test for hook script execution
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('=== Testing Hook Script via Direct IPC Call ===\n');

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

console.log('Hook script path:', prefs.hookScript || 'NOT CONFIGURED');

if (!prefs.hookScript) {
  console.log('\n❌ FAILED: Hook script not configured');
  process.exit(1);
}

console.log('✓ Prerequisites met\n');

// Import the handler (CommonJS module)
console.log('Loading IPC handlers...');

try {
  const { handleApplyTheme } = await import('./dist/main/ipcHandlers.js');

  console.log('✓ IPC handlers loaded\n');
  console.log('=== Applying Theme: nord ===\n');

  // Call the handler directly
  await handleApplyTheme(null, 'nord');

  console.log('✓ Theme applied\n');

  // Wait a moment for hook script to complete
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Check if hook was executed
  console.log('=== Checking Hook Log ===\n');

  if (fs.existsSync(logPath)) {
    const logContent = fs.readFileSync(logPath, 'utf-8');
    console.log('Hook Log Content:');
    console.log(logContent);

    if (logContent.includes('Hook script executed') && logContent.includes('nord')) {
      console.log('\n✅ SUCCESS: Hook script executed correctly!');
      console.log('✅ Hook script received theme name: nord');
      process.exit(0);
    } else {
      console.log('\n❌ FAILED: Hook log missing expected content');
      console.log('Expected: "Hook script executed" and "Theme applied: nord"');
      process.exit(1);
    }
  } else {
    console.log('❌ FAILED: Hook script was not executed (no log file created)');
    process.exit(1);
  }
} catch (error) {
  console.error('\n❌ ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
}
