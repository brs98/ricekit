/**
 * Direct test of hook script execution
 * This tests the executeHookScript function directly
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';

console.log('=== Direct Hook Script Test ===\n');

// Path to hook log file
const logPath = path.join(os.homedir(), 'Library/Application Support/MacTheme/hook-log.txt');

// Clear any previous log
if (fs.existsSync(logPath)) {
  fs.unlinkSync(logPath);
  console.log('✓ Cleared previous hook log\n');
}

// Path to hook script
const hookPath = path.join(os.homedir(), 'Library/Application Support/MacTheme/hook.sh');

console.log('Testing hook script directly...');
console.log('Hook script path:', hookPath);
console.log('Hook script exists:', fs.existsSync(hookPath));

if (!fs.existsSync(hookPath)) {
  console.log('\n❌ FAILED: Hook script not found');
  process.exit(1);
}

// Execute the hook script with a test theme name
const testThemeName = 'dracula';
console.log('\nExecuting hook script with theme:', testThemeName);

exec(`"${hookPath}" "${testThemeName}"`, (error, stdout, stderr) => {
  if (error) {
    console.error('\n❌ Hook script execution failed:', error.message);
    console.error('stderr:', stderr);
    process.exit(1);
  }

  console.log('\n=== Hook Script Output ===');
  if (stdout) {
    console.log(stdout.trim());
  }

  // Wait a moment then check the log
  setTimeout(() => {
    if (fs.existsSync(logPath)) {
      const logContent = fs.readFileSync(logPath, 'utf-8');
      console.log('\n=== Hook Log Content ===');
      console.log(logContent);

      // Verify log contains expected content
      if (logContent.includes('Hook script executed') && logContent.includes(testThemeName)) {
        console.log('\n✅ SUCCESS: Hook script executed correctly!');
        console.log(`✅ Hook script received theme name: ${testThemeName}`);
        process.exit(0);
      } else {
        console.log('\n❌ FAILED: Hook script log missing expected content');
        process.exit(1);
      }
    } else {
      console.log('\n❌ FAILED: Hook script did not create log file');
      process.exit(1);
    }
  }, 500);
});
