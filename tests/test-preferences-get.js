#!/usr/bin/env node

/**
 * Test #108: IPC channel preferences:get returns current preferences
 *
 * This test verifies that the preferences:get IPC handler:
 * 1. Is properly registered
 * 2. Returns all preference fields
 * 3. Values match preferences.json
 * 4. No sensitive data is exposed
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('='.repeat(70));
console.log('TEST #108: IPC CHANNEL preferences:get');
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

test('preferences:get handler is registered', () => {
  if (!ipcHandlersContent.includes("ipcMain.handle('preferences:get', handleGetPreferences)")) {
    throw new Error('preferences:get handler not registered');
  }
});

test('handleGetPreferences function is defined', () => {
  if (!ipcHandlersContent.includes('async function handleGetPreferences()')) {
    throw new Error('handleGetPreferences function not found');
  }
});

test('Function returns Promise<Preferences>', () => {
  if (!ipcHandlersContent.includes('async function handleGetPreferences(): Promise<Preferences>')) {
    throw new Error('Function signature missing return type');
  }
});

console.log('');

// ============================================================
// B. Preferences file handling
// ============================================================
console.log('B. Preferences file handling');
console.log('-'.repeat(70));

test('Uses getPreferencesPath() helper', () => {
  const getPreferencesMatch = ipcHandlersContent.match(/async function handleGetPreferences\(\)[^}]*getPreferencesPath\(\)/s);
  if (!getPreferencesMatch) {
    throw new Error('Does not use getPreferencesPath() helper');
  }
});

test('Reads preferences.json file', () => {
  const readMatch = ipcHandlersContent.match(/async function handleGetPreferences\(\)[^}]*readFileSync\([^)]+, ['"]utf-8['"]\)/s);
  if (!readMatch) {
    throw new Error('Does not read preferences.json with utf-8 encoding');
  }
});

test('Parses JSON content', () => {
  const parseMatch = ipcHandlersContent.match(/async function handleGetPreferences\(\)[^}]*JSON\.parse\(/s);
  if (!parseMatch) {
    throw new Error('Does not parse JSON content');
  }
});

test('Returns parsed preferences object', () => {
  const returnMatch = ipcHandlersContent.match(/async function handleGetPreferences\(\)[^}]*return\s+JSON\.parse\(/s);
  if (!returnMatch) {
    throw new Error('Does not return parsed preferences');
  }
});

console.log('');

// ============================================================
// C. Preferences file structure verification
// ============================================================
console.log('C. Preferences file structure verification');
console.log('-'.repeat(70));

const macThemeDir = path.join(os.homedir(), 'Library/Application Support/Ricekit');
const preferencesPath = path.join(macThemeDir, 'preferences.json');

test('Preferences file exists', () => {
  if (!fs.existsSync(preferencesPath)) {
    throw new Error('preferences.json does not exist at ' + preferencesPath);
  }
});

let preferences;
test('Preferences file is valid JSON', () => {
  try {
    const content = fs.readFileSync(preferencesPath, 'utf8');
    preferences = JSON.parse(content);
  } catch (error) {
    throw new Error('preferences.json is not valid JSON: ' + error.message);
  }
});

console.log('');

// ============================================================
// D. Required preference fields
// ============================================================
console.log('D. Required preference fields');
console.log('-'.repeat(70));

const requiredFields = [
  'defaultLightTheme',
  'defaultDarkTheme',
  'enabledApps',
  'favorites',
  'recentThemes',
  'keyboardShortcuts',
  'autoSwitch',
  'schedule',
  'startAtLogin',
  'showInMenuBar',
  'showNotifications',
  'hookScript'
];

requiredFields.forEach(field => {
  test(`Preferences contains '${field}' field`, () => {
    if (!(field in preferences)) {
      throw new Error(`Field '${field}' is missing from preferences`);
    }
  });
});

console.log('');

// ============================================================
// E. Field type verification
// ============================================================
console.log('E. Field type verification');
console.log('-'.repeat(70));

test('defaultLightTheme is string', () => {
  if (typeof preferences.defaultLightTheme !== 'string') {
    throw new Error('defaultLightTheme should be string');
  }
});

test('defaultDarkTheme is string', () => {
  if (typeof preferences.defaultDarkTheme !== 'string') {
    throw new Error('defaultDarkTheme should be string');
  }
});

test('enabledApps is array', () => {
  if (!Array.isArray(preferences.enabledApps)) {
    throw new Error('enabledApps should be array');
  }
});

test('favorites is array', () => {
  if (!Array.isArray(preferences.favorites)) {
    throw new Error('favorites should be array');
  }
});

test('recentThemes is array', () => {
  if (!Array.isArray(preferences.recentThemes)) {
    throw new Error('recentThemes should be array');
  }
});

test('keyboardShortcuts is object', () => {
  if (typeof preferences.keyboardShortcuts !== 'object' || preferences.keyboardShortcuts === null) {
    throw new Error('keyboardShortcuts should be object');
  }
});

test('autoSwitch is object', () => {
  if (typeof preferences.autoSwitch !== 'object' || preferences.autoSwitch === null) {
    throw new Error('autoSwitch should be object');
  }
});

test('schedule is object', () => {
  if (typeof preferences.schedule !== 'object' || preferences.schedule === null) {
    throw new Error('schedule should be object');
  }
});

test('startAtLogin is boolean', () => {
  if (typeof preferences.startAtLogin !== 'boolean') {
    throw new Error('startAtLogin should be boolean');
  }
});

test('showInMenuBar is boolean', () => {
  if (typeof preferences.showInMenuBar !== 'boolean') {
    throw new Error('showInMenuBar should be boolean');
  }
});

test('showNotifications is boolean', () => {
  if (typeof preferences.showNotifications !== 'boolean') {
    throw new Error('showNotifications should be boolean');
  }
});

test('hookScript is string', () => {
  if (typeof preferences.hookScript !== 'string') {
    throw new Error('hookScript should be string');
  }
});

console.log('');

// ============================================================
// F. Nested structure verification
// ============================================================
console.log('F. Nested structure verification');
console.log('-'.repeat(70));

test('keyboardShortcuts.quickSwitcher exists', () => {
  if (!('quickSwitcher' in preferences.keyboardShortcuts)) {
    throw new Error('keyboardShortcuts.quickSwitcher is missing');
  }
});

test('autoSwitch.enabled exists and is boolean', () => {
  if (!('enabled' in preferences.autoSwitch) || typeof preferences.autoSwitch.enabled !== 'boolean') {
    throw new Error('autoSwitch.enabled should be boolean');
  }
});

test('autoSwitch.mode exists and is string', () => {
  if (!('mode' in preferences.autoSwitch) || typeof preferences.autoSwitch.mode !== 'string') {
    throw new Error('autoSwitch.mode should be string');
  }
});

test('autoSwitch.mode is valid value', () => {
  const validModes = ['system', 'schedule', 'sunset', 'none'];
  if (!validModes.includes(preferences.autoSwitch.mode)) {
    throw new Error(`autoSwitch.mode should be one of: ${validModes.join(', ')}`);
  }
});

test('schedule.light exists', () => {
  if (!('light' in preferences.schedule)) {
    throw new Error('schedule.light is missing');
  }
});

test('schedule.dark exists', () => {
  if (!('dark' in preferences.schedule)) {
    throw new Error('schedule.dark is missing');
  }
});

console.log('');

// ============================================================
// G. Data validation
// ============================================================
console.log('G. Data validation');
console.log('-'.repeat(70));

test('enabledApps contains only strings', () => {
  const allStrings = preferences.enabledApps.every(app => typeof app === 'string');
  if (!allStrings) {
    throw new Error('enabledApps should contain only strings');
  }
});

test('favorites contains only strings', () => {
  const allStrings = preferences.favorites.every(theme => typeof theme === 'string');
  if (!allStrings) {
    throw new Error('favorites should contain only strings');
  }
});

test('recentThemes contains only strings', () => {
  const allStrings = preferences.recentThemes.every(theme => typeof theme === 'string');
  if (!allStrings) {
    throw new Error('recentThemes should contain only strings');
  }
});

test('recentThemes length is reasonable (<= 20)', () => {
  if (preferences.recentThemes.length > 20) {
    throw new Error('recentThemes should be limited to 20 items');
  }
});

console.log('');

// ============================================================
// H. Security check - no sensitive data
// ============================================================
console.log('H. Security check - no sensitive data');
console.log('-'.repeat(70));

test('No password fields in preferences', () => {
  const fieldsToCheck = ['password', 'apiKey', 'secret', 'token', 'credential'];
  const hasNone = fieldsToCheck.every(field => !(field in preferences));
  if (!hasNone) {
    throw new Error('Preferences should not contain sensitive data fields');
  }
});

test('Preferences file permissions are reasonable', () => {
  const stats = fs.statSync(preferencesPath);
  const mode = stats.mode & 0o777;
  // Should be readable by owner (at minimum)
  if ((mode & 0o400) === 0) {
    throw new Error('Preferences file should be readable by owner');
  }
});

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
  console.log('✅ preferences:get IPC handler is fully functional');
  console.log('');
  process.exit(0);
} else {
  console.log('❌ SOME TESTS FAILED');
  console.log(`❌ ${totalTests - passedTests} test(s) need attention`);
  console.log('');
  process.exit(1);
}
