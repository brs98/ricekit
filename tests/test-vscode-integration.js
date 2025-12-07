#!/usr/bin/env node
/**
 * Test script for VS Code integration
 * This script simulates applying a theme and checks if VS Code settings.json is updated
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Import the handler directly
const { handleApplyTheme } = require('./src/main/ipcHandlers.ts');

async function testVSCodeIntegration() {
  console.log('Testing VS Code integration...\n');

  const vscodeSettingsPath = path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User', 'settings.json');

  // Check initial state
  console.log('Step 1: Check initial VS Code settings state');
  const settingsExistBefore = fs.existsSync(vscodeSettingsPath);
  console.log(`  VS Code settings.json exists: ${settingsExistBefore}`);

  if (settingsExistBefore) {
    const contentBefore = fs.readFileSync(vscodeSettingsPath, 'utf-8');
    console.log(`  Current settings: ${contentBefore.substring(0, 200)}...`);
  }

  // Apply tokyo-night theme
  console.log('\nStep 2: Applying tokyo-night theme...');
  try {
    await handleApplyTheme(null, 'tokyo-night');
    console.log('  ✓ Theme applied successfully');
  } catch (error) {
    console.error('  ✗ Error applying theme:', error.message);
    process.exit(1);
  }

  // Check if settings.json was updated
  console.log('\nStep 3: Check if VS Code settings.json was updated');
  const settingsExistAfter = fs.existsSync(vscodeSettingsPath);
  console.log(`  VS Code settings.json exists: ${settingsExistAfter}`);

  if (!settingsExistAfter) {
    console.error('  ✗ FAILED: VS Code settings.json was not created');
    process.exit(1);
  }

  const contentAfter = fs.readFileSync(vscodeSettingsPath, 'utf-8');
  const settings = JSON.parse(contentAfter);

  console.log('\nStep 4: Verify workbench.colorTheme was updated');
  console.log(`  Current workbench.colorTheme: ${settings['workbench.colorTheme']}`);

  if (settings['workbench.colorTheme'] === 'Tokyo Night') {
    console.log('  ✓ SUCCESS: VS Code theme was updated correctly!');
    console.log('\n✅ All tests passed!');
  } else {
    console.error(`  ✗ FAILED: Expected "Tokyo Night", got "${settings['workbench.colorTheme']}"`);
    process.exit(1);
  }
}

// Run the test
testVSCodeIntegration().catch(error => {
  console.error('Test failed with error:', error);
  process.exit(1);
});
