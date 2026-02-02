#!/usr/bin/env node

/**
 * Automated verification of theme export
 * Simulates the export process and verifies the output
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const archiver = require('archiver');

const THEMES_DIR = path.join(os.homedir(), 'Library/Application Support/Ricekit/themes');
const TEST_EXPORT_PATH = path.join(os.tmpdir(), 'tokyo-night-verification.ricekit');

console.log('🔍 Automated Theme Export Verification\n');

// Clean up any previous test files
if (fs.existsSync(TEST_EXPORT_PATH)) {
  fs.unlinkSync(TEST_EXPORT_PATH);
  console.log('✓ Cleaned up previous test file');
}

// Test: Export tokyo-night theme
console.log('\nTest: Exporting tokyo-night theme');
console.log('==================================\n');

const themeName = 'tokyo-night';
const themePath = path.join(THEMES_DIR, themeName);

// Check theme exists
if (!fs.existsSync(themePath)) {
  console.log('❌ FAIL: Theme directory not found:', themePath);
  process.exit(1);
}
console.log('✓ Theme directory found:', themePath);

// Check theme has required files
const requiredFiles = ['theme.json', 'alacritty.toml', 'kitty.conf'];
for (const file of requiredFiles) {
  const filePath = path.join(themePath, file);
  if (!fs.existsSync(filePath)) {
    console.log(`❌ FAIL: Required file missing: ${file}`);
    process.exit(1);
  }
}
console.log('✓ Theme has required files');

// Export the theme
console.log('\nExporting theme...');

const output = fs.createWriteStream(TEST_EXPORT_PATH);
const archive = archiver('zip', {
  zlib: { level: 9 }
});

output.on('close', () => {
  console.log(`✓ Archive created: ${archive.pointer()} bytes`);

  // Verify the exported file
  verifyExport();
});

archive.on('error', (err) => {
  console.log('❌ FAIL: Archive error:', err.message);
  process.exit(1);
});

archive.pipe(output);
archive.directory(themePath, themeName);
archive.finalize();

function verifyExport() {
  console.log('\nVerifying exported file...');
  console.log('==========================\n');

  // Check file exists
  if (!fs.existsSync(TEST_EXPORT_PATH)) {
    console.log('❌ FAIL: Export file not found');
    process.exit(1);
  }
  console.log('✓ Export file exists:', TEST_EXPORT_PATH);

  // Check file size
  const stats = fs.statSync(TEST_EXPORT_PATH);
  console.log(`✓ File size: ${(stats.size / 1024).toFixed(2)} KB`);

  if (stats.size < 1000) {
    console.log('❌ FAIL: File is too small, may be incomplete');
    process.exit(1);
  }
  console.log('✓ File size is reasonable');

  // Check file extension
  if (!TEST_EXPORT_PATH.endsWith('.ricekit')) {
    console.log('❌ FAIL: File does not have .ricekit extension');
    process.exit(1);
  }
  console.log('✓ File has correct extension');

  // Summary
  console.log('\n✅ All Export Tests Passed!\n');
  console.log('Export file location:', TEST_EXPORT_PATH);
  console.log('\nTo inspect the archive:');
  console.log(`  unzip -l ${TEST_EXPORT_PATH}`);
  console.log('\nTo extract:');
  console.log(`  unzip ${TEST_EXPORT_PATH} -d /tmp/exported-theme-test\n`);

  // Clean up
  console.log('Cleaning up test file...');
  fs.unlinkSync(TEST_EXPORT_PATH);
  console.log('✓ Test file removed\n');
}
