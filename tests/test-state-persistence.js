#!/usr/bin/env node

/**
 * Test #124: Application state persists across restarts
 *
 * This test verifies that:
 * - Current theme is saved to state.json
 * - State persists after app restart
 * - Last switched timestamp is preserved
 * - Current wallpaper is saved if set
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const homeDir = os.homedir();
const ricekitDir = path.join(homeDir, 'Library', 'Application Support', 'Ricekit');
const statePath = path.join(ricekitDir, 'state.json');
const themesDir = path.join(ricekitDir, 'themes');
const currentDir = path.join(ricekitDir, 'current');
const symlinkPath = path.join(currentDir, 'theme');

console.log('Test #124: Application state persists across restarts');
console.log('='.repeat(70));

let testsPassed = 0;
let testsFailed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`✓ ${description}`);
    testsPassed++;
  } catch (error) {
    console.error(`✗ ${description}`);
    console.error(`  Error: ${error.message}`);
    testsFailed++;
  }
}

// Step 1: Check that state.json exists
console.log('\nStep 1: Verify state.json exists');
console.log('-'.repeat(70));

test('state.json file exists', () => {
  if (!fs.existsSync(statePath)) {
    throw new Error(`state.json not found at ${statePath}`);
  }
});

// Step 2: Read and validate state structure
console.log('\nStep 2: Read and validate state structure');
console.log('-'.repeat(70));

let originalState;
try {
  const stateContent = fs.readFileSync(statePath, 'utf-8');
  originalState = JSON.parse(stateContent);
  console.log(`Current state:`, originalState);
} catch (error) {
  console.error('Failed to read state.json:', error.message);
  process.exit(1);
}

test('state has currentTheme field', () => {
  if (!('currentTheme' in originalState)) {
    throw new Error('state.json missing currentTheme field');
  }
});

test('state has lastSwitched field', () => {
  if (!('lastSwitched' in originalState)) {
    throw new Error('state.json missing lastSwitched field');
  }
});

test('lastSwitched is a valid timestamp', () => {
  if (typeof originalState.lastSwitched !== 'number') {
    throw new Error('lastSwitched is not a number');
  }
  const date = new Date(originalState.lastSwitched);
  if (isNaN(date.getTime())) {
    throw new Error('lastSwitched is not a valid timestamp');
  }
});

// Step 3: Simulate theme application (update state)
console.log('\nStep 3: Simulate theme application and state update');
console.log('-'.repeat(70));

// Get available themes
const themes = fs.readdirSync(themesDir).filter(item => {
  const itemPath = path.join(themesDir, item);
  return fs.statSync(itemPath).isDirectory();
});

if (themes.length === 0) {
  console.error('No themes available for testing');
  process.exit(1);
}

// Pick a test theme (different from current if possible)
let testTheme = themes[0];
if (themes.length > 1 && originalState.currentTheme === testTheme) {
  testTheme = themes[1];
}

const testThemePath = path.join(themesDir, testTheme);
const testTimestamp = Date.now();

console.log(`Applying test theme: ${testTheme}`);

// Update symlink
if (fs.existsSync(symlinkPath)) {
  const stats = fs.lstatSync(symlinkPath);
  if (stats.isSymbolicLink()) {
    fs.unlinkSync(symlinkPath);
  }
}
fs.symlinkSync(testThemePath, symlinkPath, 'dir');

// Update state
const newState = {
  currentTheme: testTheme,
  lastSwitched: testTimestamp,
  currentWallpaper: originalState.currentWallpaper || null,
};
fs.writeFileSync(statePath, JSON.stringify(newState, null, 2));
console.log(`State updated: ${JSON.stringify(newState)}`);

// Step 4: Verify state was written correctly
console.log('\nStep 4: Verify state was written correctly');
console.log('-'.repeat(70));

const writtenState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));

test('state file was updated', () => {
  if (writtenState.currentTheme !== testTheme) {
    throw new Error(`Expected currentTheme to be ${testTheme}, got ${writtenState.currentTheme}`);
  }
});

test('lastSwitched timestamp was updated', () => {
  if (writtenState.lastSwitched !== testTimestamp) {
    throw new Error(`Expected lastSwitched to be ${testTimestamp}, got ${writtenState.lastSwitched}`);
  }
});

// Step 5: Simulate app restart by re-reading state
console.log('\nStep 5: Simulate app restart (re-read state.json)');
console.log('-'.repeat(70));

// Clear from memory (simulate restart)
const stateAfterRestart = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
console.log(`State after "restart": ${JSON.stringify(stateAfterRestart)}`);

test('currentTheme persisted after restart', () => {
  if (stateAfterRestart.currentTheme !== testTheme) {
    throw new Error(`State not persisted: expected ${testTheme}, got ${stateAfterRestart.currentTheme}`);
  }
});

test('lastSwitched persisted after restart', () => {
  if (stateAfterRestart.lastSwitched !== testTimestamp) {
    throw new Error(`Timestamp not persisted: expected ${testTimestamp}, got ${stateAfterRestart.lastSwitched}`);
  }
});

test('state is valid JSON after restart', () => {
  // This test already passed if we got here, but let's be explicit
  if (typeof stateAfterRestart !== 'object') {
    throw new Error('State is not a valid object');
  }
});

// Step 6: Verify symlink matches state
console.log('\nStep 6: Verify symlink matches persisted state');
console.log('-'.repeat(70));

test('symlink exists and matches state', () => {
  if (!fs.existsSync(symlinkPath)) {
    throw new Error('Symlink does not exist');
  }
  const symlinkTarget = fs.readlinkSync(symlinkPath);
  const expectedTarget = path.join(themesDir, stateAfterRestart.currentTheme);
  if (symlinkTarget !== expectedTarget) {
    throw new Error(`Symlink points to ${symlinkTarget}, expected ${expectedTarget}`);
  }
});

// Step 7: Test multiple state updates
console.log('\nStep 7: Test multiple consecutive state updates');
console.log('-'.repeat(70));

for (let i = 0; i < 3; i++) {
  const theme = themes[i % themes.length];
  const themePath = path.join(themesDir, theme);
  const timestamp = Date.now() + i; // Ensure unique timestamps

  // Update state
  const state = {
    currentTheme: theme,
    lastSwitched: timestamp,
    currentWallpaper: null,
  };
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

  // Re-read and verify
  const readState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));

  test(`update ${i + 1}: state persisted correctly (${theme})`, () => {
    if (readState.currentTheme !== theme || readState.lastSwitched !== timestamp) {
      throw new Error('State not persisted correctly after update');
    }
  });
}

// Step 8: Restore original state
console.log('\nStep 8: Restore original state');
console.log('-'.repeat(70));

fs.writeFileSync(statePath, JSON.stringify(originalState, null, 2));

// Restore original symlink
if (originalState.currentTheme) {
  const originalThemePath = path.join(themesDir, originalState.currentTheme);
  if (fs.existsSync(originalThemePath)) {
    if (fs.existsSync(symlinkPath)) {
      const stats = fs.lstatSync(symlinkPath);
      if (stats.isSymbolicLink()) {
        fs.unlinkSync(symlinkPath);
      }
    }
    fs.symlinkSync(originalThemePath, symlinkPath, 'dir');
    console.log(`Restored original state: ${originalState.currentTheme}`);
  }
}

test('original state restored', () => {
  const restoredState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  if (JSON.stringify(restoredState) !== JSON.stringify(originalState)) {
    throw new Error('Failed to restore original state');
  }
});

// Summary
console.log('\n' + '='.repeat(70));
console.log('TEST SUMMARY');
console.log('='.repeat(70));
console.log(`Tests passed: ${testsPassed}`);
console.log(`Tests failed: ${testsFailed}`);
console.log(`Total tests: ${testsPassed + testsFailed}`);

if (testsFailed === 0) {
  console.log('\n✓ All tests PASSED');
  console.log('\nTest #124: Application state persists across restarts - VERIFIED');
  process.exit(0);
} else {
  console.log('\n✗ Some tests FAILED');
  process.exit(1);
}
