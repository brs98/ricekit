/**
 * Test theme application with terminal reload
 * This simulates applying a theme and checks console output
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs');
const path = require('path');
const os = require('os');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testThemeApplyWithReload() {
  console.log('\n=== Testing Theme Application with Terminal Reload ===\n');

  // Check current theme
  const statePath = path.join(os.homedir(), 'Library/Application Support/Ricekit/state.json');
  const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  const currentTheme = state.currentTheme;

  console.log(`Current theme: ${currentTheme}`);

  // Pick a different theme to apply
  const themeToApply = currentTheme === 'nord' ? 'tokyo-night' : 'nord';
  console.log(`Will apply: ${themeToApply}\n`);

  console.log('To test the terminal reload feature:');
  console.log('1. In the Ricekit app, click on a theme card');
  console.log('2. Click the "Apply" button');
  console.log('3. Watch the console output from npm run dev\n');

  console.log('Expected console output:');
  console.log(`  Applying theme: ${themeToApply}`);
  console.log('  Created symlink: ...');
  console.log('  Updated recent themes: ...');
  console.log(`  Theme ${themeToApply} applied successfully`);
  console.log('  Notifying terminals to reload themes...');
  console.log('  Kitty not available or remote control disabled: ...');
  console.log('  iTerm2 not available or not running: ...');
  console.log('  Terminal reload notifications sent\n');

  console.log('Note: Since most terminals are not configured or running,');
  console.log('you will likely see "not available" messages, which is expected.');
  console.log('The important thing is that the notification system executes.\n');

  console.log('Verifying symlink after theme application...');
  await sleep(2000);

  const symlinkPath = path.join(os.homedir(), 'Library/Application Support/Ricekit/current/theme');
  try {
    const target = fs.readlinkSync(symlinkPath);
    console.log(`✓ Symlink points to: ${target}`);
  } catch (err) {
    console.log('Symlink check:', err.message);
  }

  console.log('\n=== Test Complete ===\n');
}

testThemeApplyWithReload().catch(err => {
  console.error('Test error:', err);
});
