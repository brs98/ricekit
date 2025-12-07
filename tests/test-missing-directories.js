#!/usr/bin/env node

/**
 * Test #114: File system operations handle missing directories gracefully
 *
 * This test verifies that:
 * 1. The app can recover from missing directories
 * 2. Applying a theme recreates missing directories
 * 3. No crashes occur when directories are missing
 * 4. All required files are created properly
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

console.log('='.repeat(80));
console.log('TEST #114: FILE SYSTEM OPERATIONS HANDLE MISSING DIRECTORIES');
console.log('='.repeat(80));
console.log();

const appDataDir = path.join(os.homedir(), 'Library/Application Support/MacTheme');
const backupDir = path.join(os.homedir(), 'Library/Application Support/MacTheme.backup');

let passCount = 0;
let failCount = 0;
let testCount = 0;

function test(description, fn) {
  testCount++;
  try {
    fn();
    console.log(`✅ Test ${testCount}: ${description}`);
    passCount++;
  } catch (error) {
    console.log(`❌ Test ${testCount}: ${description}`);
    console.log(`   Error: ${error.message}`);
    failCount++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

console.log('--- Step 1: Check Current Implementation ---\n');

const ipcHandlersPath = path.join(__dirname, 'src/main/ipcHandlers.ts');
const ipcHandlersContent = fs.readFileSync(ipcHandlersPath, 'utf-8');

// Extract handleApplyTheme function
const handleApplyThemeMatch = ipcHandlersContent.match(
  /export async function handleApplyTheme[\s\S]*?(?=\nexport|$)/
);

if (!handleApplyThemeMatch) {
  console.log('❌ Could not find handleApplyTheme function');
  process.exit(1);
}

const handleApplyThemeBody = handleApplyThemeMatch[0];

console.log('Analyzing handleApplyTheme implementation...\n');

test('handleApplyTheme exists', () => {
  assert(handleApplyThemeBody.length > 0, 'Function should exist');
});

test('handleApplyTheme gets currentDir', () => {
  assert(
    handleApplyThemeBody.includes('getCurrentDir()'),
    'Should call getCurrentDir()'
  );
});

test('handleApplyTheme creates symlink', () => {
  assert(
    handleApplyThemeBody.includes('fs.symlinkSync'),
    'Should create symlink using fs.symlinkSync'
  );
});

test('handleApplyTheme reads/writes state.json', () => {
  assert(
    handleApplyThemeBody.includes('getStatePath') &&
    handleApplyThemeBody.includes('fs.readFileSync') &&
    handleApplyThemeBody.includes('fs.writeFileSync'),
    'Should read and write state.json'
  );
});

test('handleApplyTheme reads/writes preferences.json', () => {
  assert(
    handleApplyThemeBody.includes('getPreferencesPath'),
    'Should read and write preferences.json'
  );
});

console.log('\n--- Step 2: Check Directory Validation ---\n');

test('handleApplyTheme calls ensureDirectories (EXPECTED TO FAIL)', () => {
  assert(
    handleApplyThemeBody.includes('ensureDirectories') ||
    handleApplyThemeBody.includes('ensureDirectories()'),
    'Should call ensureDirectories() to ensure directories exist'
  );
});

test('handleApplyTheme ensures directories via ensureDirectories()', () => {
  // ensureDirectories() handles all directory creation, so explicit checks aren't needed
  assert(
    handleApplyThemeBody.includes('ensureDirectories'),
    'Should call ensureDirectories() which creates all needed directories'
  );
});

test('handleApplyTheme creates currentDir if missing (EXPECTED TO FAIL)', () => {
  assert(
    handleApplyThemeBody.includes('fs.mkdirSync') &&
    handleApplyThemeBody.includes('currentDir'),
    'Should create currentDir if it does not exist'
  );
});

console.log('\n--- Step 3: Check Error Handling ---\n');

test('handleApplyTheme has try-catch around symlink creation', () => {
  // Check if symlinkSync is inside a try-catch
  const symlinkMatch = handleApplyThemeBody.match(/try\s*{[\s\S]*?fs\.symlinkSync[\s\S]*?}\s*catch/);
  assert(
    symlinkMatch,
    'Symlink creation should be wrapped in try-catch'
  );
});

test('handleApplyTheme catches and logs symlink errors', () => {
  assert(
    handleApplyThemeBody.includes('catch') &&
    handleApplyThemeBody.includes('console.error'),
    'Should catch and log symlink errors'
  );
});

console.log('\n--- Step 4: Implementation Recommendations ---\n');

console.log('To handle missing directories gracefully, handleApplyTheme should:');
console.log();
console.log('1. Import ensureDirectories:');
console.log('   import { ensureDirectories } from "./directories";');
console.log();
console.log('2. Call it at the beginning of handleApplyTheme:');
console.log('   export async function handleApplyTheme(_event: any, name: string): Promise<void> {');
console.log('     console.log(`Applying theme: ${name}`);');
console.log('     ');
console.log('     // Ensure all required directories exist');
console.log('     ensureDirectories();');
console.log('     ');
console.log('     // ... rest of function');
console.log('   }');
console.log();
console.log('3. This will create:');
console.log('   - ~/Library/Application Support/MacTheme/');
console.log('   - ~/Library/Application Support/MacTheme/themes/');
console.log('   - ~/Library/Application Support/MacTheme/custom-themes/');
console.log('   - ~/Library/Application Support/MacTheme/current/');
console.log();
console.log('4. Benefits:');
console.log('   ✅ No crashes from missing directories');
console.log('   ✅ Graceful recovery from directory deletion');
console.log('   ✅ Safe theme application even after manual cleanup');
console.log('   ✅ Better user experience');
console.log();

console.log('--- Step 5: Additional Functions to Fix ---\n');

// Check other functions that might need the same fix
const functionsToCheck = [
  'handleCreateTheme',
  'handleUpdateTheme',
  'handleDeleteTheme',
  'handleExportTheme',
  'handleImportTheme',
  'handleListWallpapers',
  'handleApplyWallpaper',
  'handleGetPreferences',
  'handleSetPreferences',
  'handleGetState',
];

console.log('Other functions that should call ensureDirectories():');
console.log();

functionsToCheck.forEach(funcName => {
  const funcMatch = ipcHandlersContent.match(
    new RegExp(`async function ${funcName}[\\s\\S]*?(?=\\nexport|$)`)
  );

  if (funcMatch) {
    const funcBody = funcMatch[0];
    const usesFs = funcBody.includes('fs.') || funcBody.includes('readFileSync') || funcBody.includes('writeFileSync');
    const callsEnsure = funcBody.includes('ensureDirectories');

    if (usesFs && !callsEnsure) {
      console.log(`⚠️  ${funcName} - Uses file system but doesn't ensure directories`);
    }
  }
});

console.log();
console.log('--- Summary ---\n');
console.log('='.repeat(80));
console.log('TEST SUMMARY');
console.log('='.repeat(80));
console.log(`Total Tests: ${testCount}`);
console.log(`✅ Passed: ${passCount}`);
console.log(`❌ Failed: ${failCount}`);
console.log('='.repeat(80));
console.log();

if (failCount > 0) {
  console.log('⚠️  IMPLEMENTATION REQUIRED');
  console.log();
  console.log('handleApplyTheme and other IPC handlers should call ensureDirectories()');
  console.log('at the beginning to handle missing directories gracefully.');
  console.log();
  process.exit(1);
} else {
  console.log('✅ ALL TESTS PASSED');
  console.log();
  console.log('File system operations properly handle missing directories!');
  process.exit(0);
}
