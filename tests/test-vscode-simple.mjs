import fs from 'fs';
import path from 'path';
import os from 'os';

// Simulate theme application by checking file system changes
async function testVSCode() {
  const vscodeSettingsPath = path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User', 'settings.json');
  const statePath = path.join(os.homedir(), 'Library', 'Application Support', 'Ricekit', 'state.json');

  console.log('=== VS Code Integration Test ===\n');

  // Check initial state
  console.log('1. Initial State:');
  console.log(`   State file: ${statePath}`);
  if (fs.existsSync(statePath)) {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    console.log(`   Current theme: ${state.currentTheme}`);
  }

  console.log(`   VS Code settings: ${vscodeSettingsPath}`);
  const settingsExist = fs.existsSync(vscodeSettingsPath);
  console.log(`   Settings exist: ${settingsExist}`);

  if (settingsExist) {
    const settings = JSON.parse(fs.readFileSync(vscodeSettingsPath, 'utf-8'));
    console.log(`   Current VS Code theme: ${settings['workbench.colorTheme'] || 'not set'}`);
  }

  console.log('\n2. Apply a theme through the Ricekit app UI');
  console.log('   (Use the app to apply tokyo-night theme)');
  console.log('\n   Press Enter when done...');

  // Wait for user input
  process.stdin.once('data', () => {
    console.log('\n3. Checking results...');

    // Check if VS Code settings was created/updated
    if (!fs.existsSync(vscodeSettingsPath)) {
      console.log('   ✗ FAIL: VS Code settings.json was not created');
      process.exit(1);
    }

    const settings = JSON.parse(fs.readFileSync(vscodeSettingsPath, 'utf-8'));
    const vscodeTheme = settings['workbench.colorTheme'];

    console.log(`   VS Code theme is now: ${vscodeTheme}`);

    if (vscodeTheme && vscodeTheme.includes('Tokyo')) {
      console.log('   ✓ SUCCESS: VS Code theme was updated!');
    } else {
      console.log(`   ✗ FAIL: Expected Tokyo Night, got ${vscodeTheme}`);
    }

    process.exit(0);
  });
}

testVSCode();
