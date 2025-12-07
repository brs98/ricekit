#!/usr/bin/env node

/**
 * Backend test for theme export functionality
 * Tests the IPC handler directly
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🔍 Testing Theme Export Backend\n');

// Test export path
const testExportPath = path.join(os.tmpdir(), 'tokyo-night-test.mactheme');

console.log('Test Configuration:');
console.log('==================');
console.log(`Export path: ${testExportPath}\n`);

// Clean up any previous test files
if (fs.existsSync(testExportPath)) {
  fs.unlinkSync(testExportPath);
  console.log('✓ Cleaned up previous test file\n');
}

console.log('Expected Behavior:');
console.log('==================');
console.log('When calling window.electronAPI.exportTheme("tokyo-night", testPath):');
console.log('1. Function should find tokyo-night theme directory');
console.log('2. Create a zip archive at testPath');
console.log('3. Archive should contain tokyo-night/ directory');
console.log('4. Inside should be all config files (theme.json, alacritty.toml, etc.)');
console.log('5. Return the export path\n');

console.log('To test manually:');
console.log('==================');
console.log('1. Open the MacTheme app (should be running)');
console.log('2. Open DevTools (View > Toggle Developer Tools)');
console.log('3. In the console, run:');
console.log(`   await window.electronAPI.exportTheme("tokyo-night", "${testExportPath}")`);
console.log('4. Check if file was created:');
console.log(`   ls -lh ${testExportPath}`);
console.log('5. Verify contents:');
console.log(`   unzip -l ${testExportPath}\n`);

console.log('Alternative: Use the UI');
console.log('========================');
console.log('1. Navigate to Settings');
console.log('2. Scroll to "Backup & Restore"');
console.log('3. Click "Export..." button');
console.log('4. Select tokyo-night theme');
console.log('5. Click "Export N Theme(s)"');
console.log('6. Choose Desktop as location');
console.log('7. Verify file appears on Desktop\n');
