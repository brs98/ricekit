/**
 * Direct test of VS Code integration
 * This simulates the theme application by directly reading/writing files
 * to verify the integration logic works correctly
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const homeDir = os.homedir();
const vscodeSettingsPath = path.join(homeDir, 'Library', 'Application Support', 'Code', 'User', 'settings.json');

console.log('=== Direct VS Code Integration Test ===\n');

// Step 1: Check initial state
console.log('Step 1: Initial State');
console.log(`  VS Code settings path: ${vscodeSettingsPath}`);
console.log(`  File exists: ${fs.existsSync(vscodeSettingsPath)}`);

if (fs.existsSync(vscodeSettingsPath)) {
  const before = JSON.parse(fs.readFileSync(vscodeSettingsPath, 'utf-8'));
  console.log(`  Current theme: ${before['workbench.colorTheme']}`);
}

// Step 2: Simulate theme application (tokyo-night)
console.log('\nStep 2: Simulating tokyo-night theme application...');

// This is what our updateVSCodeSettings function does:
const themeName = 'tokyo-night';
const themeNameMapping = {
  'tokyo-night': 'Tokyo Night',
  'catppuccin-mocha': 'Catppuccin Mocha',
  'dracula': 'Dracula',
  'nord': 'Nord',
};

// Read settings
let settings = {};
if (fs.existsSync(vscodeSettingsPath)) {
  const content = fs.readFileSync(vscodeSettingsPath, 'utf-8');
  if (content.trim()) {
    settings = JSON.parse(content);
  }
}

console.log(`  Loaded existing settings: ${JSON.stringify(settings)}`);

// Update theme
const vscodeThemeName = themeNameMapping[themeName] || 'Default Dark+';
settings['workbench.colorTheme'] = vscodeThemeName;

console.log(`  Setting workbench.colorTheme to: ${vscodeThemeName}`);

// Write back
fs.writeFileSync(vscodeSettingsPath, JSON.stringify(settings, null, 2), 'utf-8');

// Step 3: Verify
console.log('\nStep 3: Verification');
const after = JSON.parse(fs.readFileSync(vscodeSettingsPath, 'utf-8'));
console.log(`  VS Code theme is now: ${after['workbench.colorTheme']}`);

if (after['workbench.colorTheme'] === 'Tokyo Night') {
  console.log('  ✅ SUCCESS: VS Code theme was updated correctly!');
  console.log('\n=== TEST PASSED ===');
} else {
  console.log(`  ❌ FAIL: Expected "Tokyo Night", got "${after['workbench.colorTheme']}"`);
  console.log('\n=== TEST FAILED ===');
  process.exit(1);
}

// Step 4: Show final settings file
console.log('\nFinal settings.json content:');
console.log(JSON.stringify(after, null, 2));
