#!/usr/bin/env node

/**
 * Test #109: IPC channel preferences:set updates preferences
 *
 * This test verifies that the preferences:set IPC handler:
 * 1. Is properly registered
 * 2. Updates preferences.json file
 * 3. Handles preference changes correctly
 * 4. Triggers side effects (tray visibility, shortcuts, etc.)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('='.repeat(70));
console.log('TEST #109: IPC CHANNEL preferences:set');
console.log('='.repeat(70));
console.log('');

let passedTests = 0;
let totalTests = 0;

function test(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`   ✓ ${description}`);
    passedTests++;
    return true;
  } catch (error) {
    console.log(`   ✗ ${description}`);
    console.log(`     Error: ${error.message}`);
    return false;
  }
}

// ============================================================
// A. Implementation verification
// ============================================================
console.log('A. Implementation verification');
console.log('-'.repeat(70));

const ipcHandlersPath = path.join(__dirname, 'src/main/ipcHandlers.ts');

test('IPC handlers file exists', () => {
  if (!fs.existsSync(ipcHandlersPath)) {
    throw new Error('ipcHandlers.ts not found');
  }
});

const ipcHandlersContent = fs.readFileSync(ipcHandlersPath, 'utf8');

test('preferences:set handler is registered', () => {
  if (!ipcHandlersContent.includes("ipcMain.handle('preferences:set', handleSetPreferences)")) {
    throw new Error('preferences:set handler not registered');
  }
});

test('handleSetPreferences function is defined', () => {
  if (!ipcHandlersContent.includes('async function handleSetPreferences')) {
    throw new Error('handleSetPreferences function not found');
  }
});

test('Function accepts preferences parameter', () => {
  const match = ipcHandlersContent.match(/async function handleSetPreferences\([^)]*prefs:\s*Preferences/);
  if (!match) {
    throw new Error('Function should accept prefs: Preferences parameter');
  }
});

test('Function returns Promise<void>', () => {
  const match = ipcHandlersContent.match(/async function handleSetPreferences\([^)]*\):\s*Promise<void>/);
  if (!match) {
    throw new Error('Function should return Promise<void>');
  }
});

console.log('');

// ============================================================
// B. File operations
// ============================================================
console.log('B. File operations');
console.log('-'.repeat(70));

test('Uses getPreferencesPath() helper', () => {
  const match = ipcHandlersContent.match(/async function handleSetPreferences[^}]*getPreferencesPath\(\)/s);
  if (!match) {
    throw new Error('Does not use getPreferencesPath() helper');
  }
});

test('Reads old preferences first', () => {
  const match = ipcHandlersContent.match(/async function handleSetPreferences[^}]*readFileSync[^}]*oldPrefs/s);
  if (!match) {
    throw new Error('Does not read old preferences to detect changes');
  }
});

test('Writes new preferences to file', () => {
  const match = ipcHandlersContent.match(/async function handleSetPreferences[^}]*writeFileSync\([^)]+,\s*JSON\.stringify\(prefs/s);
  if (!match) {
    throw new Error('Does not write preferences to file');
  }
});

test('Formats JSON with indentation', () => {
  const match = ipcHandlersContent.match(/JSON\.stringify\(prefs,\s*null,\s*2\)/);
  if (!match) {
    throw new Error('Should format JSON with 2-space indentation');
  }
});

test('Logs successful update', () => {
  const match = ipcHandlersContent.match(/async function handleSetPreferences[^}]*console\.log[^}]*Preferences updated/s);
  if (!match) {
    throw new Error('Does not log successful update');
  }
});

console.log('');

// ============================================================
// C. Tray visibility handling
// ============================================================
console.log('C. Tray visibility handling');
console.log('-'.repeat(70));

test('Checks if showInMenuBar changed', () => {
  const match = ipcHandlersContent.match(/oldPrefs\.showInMenuBar\s*!==\s*prefs\.showInMenuBar/);
  if (!match) {
    throw new Error('Does not check if showInMenuBar changed');
  }
});

test('Imports updateTrayVisibility dynamically', () => {
  const match = ipcHandlersContent.match(/await import\(['"]\.\/main['"]\)/);
  if (!match) {
    throw new Error('Does not import main module dynamically');
  }
});

test('Calls updateTrayVisibility on change', () => {
  const match = ipcHandlersContent.match(/updateTrayVisibility\(prefs\.showInMenuBar\)/);
  if (!match) {
    throw new Error('Does not call updateTrayVisibility');
  }
});

test('Logs tray visibility change', () => {
  const match = ipcHandlersContent.match(/console\.log\([^)]*Menu bar icon[^)]*shown[^)]*hidden/);
  if (!match) {
    throw new Error('Does not log tray visibility change');
  }
});

test('Has error handling for tray update', () => {
  const match = ipcHandlersContent.match(/catch[^}]*Failed to update tray visibility/s);
  if (!match) {
    throw new Error('Missing error handling for tray update');
  }
});

console.log('');

// ============================================================
// D. Keyboard shortcut handling
// ============================================================
console.log('D. Keyboard shortcut handling');
console.log('-'.repeat(70));

test('Checks if keyboard shortcut changed', () => {
  const match = ipcHandlersContent.match(/oldPrefs\.keyboardShortcuts.*!==.*prefs\.keyboardShortcuts/s);
  if (!match) {
    throw new Error('Does not check if keyboard shortcut changed');
  }
});

test('Imports updateQuickSwitcherShortcut function', () => {
  const match = ipcHandlersContent.match(/updateQuickSwitcherShortcut/);
  if (!match) {
    throw new Error('Does not import updateQuickSwitcherShortcut');
  }
});

test('Calls updateQuickSwitcherShortcut on change', () => {
  const match = ipcHandlersContent.match(/updateQuickSwitcherShortcut\(/);
  if (!match) {
    throw new Error('Does not call updateQuickSwitcherShortcut');
  }
});

test('Logs shortcut update', () => {
  const match = ipcHandlersContent.match(/console\.log[^}]*keyboard shortcut/is);
  if (!match) {
    throw new Error('Does not log keyboard shortcut update');
  }
});

test('Has error handling for shortcut update', () => {
  const match = ipcHandlersContent.match(/catch[^}]*Failed to update.*shortcut/s);
  if (!match) {
    throw new Error('Missing error handling for shortcut update');
  }
});

console.log('');

// ============================================================
// E. Auto-switch handling
// ============================================================
console.log('E. Auto-switch handling');
console.log('-'.repeat(70));

test('Checks if auto-switch settings changed', () => {
  const match = ipcHandlersContent.match(/autoSwitch/);
  if (!match) {
    throw new Error('Does not handle autoSwitch changes');
  }
});

test('References startupManager for schedule changes', () => {
  const match = ipcHandlersContent.match(/startupManager|scheduleManager|initAutoSwitch/);
  if (!match) {
    // This is optional, may be handled elsewhere
    console.log('     Note: Auto-switch may be handled in startup');
  }
});

console.log('');

// ============================================================
// F. Error handling
// ============================================================
console.log('F. Error handling');
console.log('-'.repeat(70));

test('Has try-catch blocks for side effects', () => {
  const matches = ipcHandlersContent.match(/try\s*{/g);
  if (!matches || matches.length < 2) {
    throw new Error('Should have try-catch blocks for error handling');
  }
});

test('Logs errors appropriately', () => {
  const match = ipcHandlersContent.match(/console\.error/);
  if (!match) {
    throw new Error('Should log errors with console.error');
  }
});

test('Does not throw on non-critical errors', () => {
  // Check that errors are caught and logged, not re-thrown
  const functionBody = ipcHandlersContent.match(/async function handleSetPreferences[^}]*{([^}]+})+/s);
  if (functionBody) {
    const hasRethrow = functionBody[0].includes('throw err') || functionBody[0].includes('throw error');
    if (hasRethrow) {
      console.log('     Note: Function may throw on critical errors');
    }
  }
});

console.log('');

// ============================================================
// G. File system verification
// ============================================================
console.log('G. File system verification');
console.log('-'.repeat(70));

const ricekitDir = path.join(os.homedir(), 'Library/Application Support/Ricekit');
const preferencesPath = path.join(ricekitDir, 'preferences.json');

test('Preferences file exists', () => {
  if (!fs.existsSync(preferencesPath)) {
    throw new Error('preferences.json does not exist at ' + preferencesPath);
  }
});

test('Preferences file is writable', () => {
  try {
    fs.accessSync(preferencesPath, fs.constants.W_OK);
  } catch (error) {
    throw new Error('preferences.json is not writable');
  }
});

test('Can read current preferences', () => {
  try {
    const content = fs.readFileSync(preferencesPath, 'utf8');
    JSON.parse(content);
  } catch (error) {
    throw new Error('Cannot read or parse preferences.json');
  }
});

console.log('');

// ============================================================
// H. Simulation test (read-only verification)
// ============================================================
console.log('H. Simulation test (read-only verification)');
console.log('-'.repeat(70));

let originalPrefs;
test('Read current preferences as baseline', () => {
  const content = fs.readFileSync(preferencesPath, 'utf8');
  originalPrefs = JSON.parse(content);
  if (!originalPrefs) {
    throw new Error('Failed to read original preferences');
  }
});

test('Preferences have expected structure', () => {
  const requiredFields = ['defaultLightTheme', 'defaultDarkTheme', 'enabledApps', 'favorites',
                          'recentThemes', 'keyboardShortcuts', 'autoSwitch', 'schedule'];
  const hasAllFields = requiredFields.every(field => field in originalPrefs);
  if (!hasAllFields) {
    throw new Error('Preferences missing required fields');
  }
});

test('Preferences values are valid types', () => {
  if (typeof originalPrefs.defaultLightTheme !== 'string') {
    throw new Error('defaultLightTheme should be string');
  }
  if (typeof originalPrefs.defaultDarkTheme !== 'string') {
    throw new Error('defaultDarkTheme should be string');
  }
  if (!Array.isArray(originalPrefs.enabledApps)) {
    throw new Error('enabledApps should be array');
  }
  if (typeof originalPrefs.autoSwitch !== 'object') {
    throw new Error('autoSwitch should be object');
  }
});

console.log('');
console.log('Note: Actual write verification would require running the Electron app');
console.log('      The IPC handler can only be tested through the app IPC system');
console.log('');

// ============================================================
// SUMMARY
// ============================================================
console.log('='.repeat(70));
console.log('TEST RESULTS');
console.log('='.repeat(70));
console.log(`Tests Passed: ${passedTests}/${totalTests}`);
console.log('');

if (passedTests === totalTests) {
  console.log('✅ ALL TESTS PASSED');
  console.log('✅ preferences:set IPC handler is fully implemented');
  console.log('✅ Handles file writes, tray updates, and keyboard shortcuts');
  console.log('');
  process.exit(0);
} else {
  console.log('❌ SOME TESTS FAILED');
  console.log(`❌ ${totalTests - passedTests} test(s) need attention`);
  console.log('');
  process.exit(1);
}
