#!/usr/bin/env node

/**
 * Test #111: IPC channel system:on-appearance-change subscribes to appearance events
 *
 * This test verifies that:
 * 1. The event handler is properly exposed via context bridge
 * 2. The main process sends 'system:appearance-changed' events to renderer
 * 3. The callback receives the new appearance value
 * 4. The event is triggered when system appearance changes
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(80));
console.log('TEST #111: IPC CHANNEL system:on-appearance-change');
console.log('='.repeat(80));
console.log();

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

// =============================================================================
// PART 1: Verify preload.ts exposes onAppearanceChange
// =============================================================================

console.log('\n--- Part 1: Preload Context Bridge Exposure ---\n');

const preloadPath = path.join(__dirname, 'src/preload/preload.ts');
const preloadContent = fs.readFileSync(preloadPath, 'utf-8');

test('Preload file exists', () => {
  assert(fs.existsSync(preloadPath), 'Preload file should exist');
});

test('Preload imports contextBridge and ipcRenderer', () => {
  assert(
    preloadContent.includes('import { contextBridge, ipcRenderer }'),
    'Should import contextBridge and ipcRenderer'
  );
});

test('Preload exposes onAppearanceChange API', () => {
  assert(
    preloadContent.includes('onAppearanceChange'),
    'Should expose onAppearanceChange in electronAPI'
  );
});

test('onAppearanceChange uses ipcRenderer.on pattern', () => {
  // Check that onAppearanceChange takes a callback and uses ipcRenderer.on
  const hasCallback = preloadContent.includes('onAppearanceChange:') &&
                      preloadContent.includes('(callback') &&
                      preloadContent.includes('ipcRenderer.on');
  assert(
    hasCallback,
    'onAppearanceChange should use ipcRenderer.on with callback'
  );
});

test('onAppearanceChange listens to system:appearance-changed channel', () => {
  assert(
    preloadContent.includes("'system:appearance-changed'"),
    'Should listen to system:appearance-changed IPC channel'
  );
});

test('onAppearanceChange callback receives appearance parameter', () => {
  const callbackMatch = preloadContent.match(
    /onAppearanceChange:[^}]*\(_event,\s*appearance\)\s*=>\s*callback\(appearance\)/s
  );
  assert(
    callbackMatch,
    'Callback should receive appearance parameter and pass it to user callback'
  );
});

// =============================================================================
// PART 2: Verify main.ts listens to nativeTheme.on('updated')
// =============================================================================

console.log('\n--- Part 2: Main Process Event Listener ---\n');

const mainPath = path.join(__dirname, 'src/main/main.ts');
const mainContent = fs.readFileSync(mainPath, 'utf-8');

test('Main process imports nativeTheme', () => {
  assert(
    mainContent.includes('nativeTheme'),
    'Main process should import nativeTheme from electron'
  );
});

test('Main process listens to nativeTheme updated event', () => {
  assert(
    mainContent.includes("nativeTheme.on('updated'"),
    'Main process should listen to nativeTheme.on("updated") event'
  );
});

test('Main process calls handleAppearanceChange on updated event', () => {
  const eventListenerMatch = mainContent.match(
    /nativeTheme\.on\(['"]updated['"]\s*,\s*\([^)]*\)\s*=>\s*{[^}]*handleAppearanceChange/s
  );
  assert(
    eventListenerMatch,
    'Main process should call handleAppearanceChange when nativeTheme updated'
  );
});

test('Main process imports handleAppearanceChange', () => {
  assert(
    mainContent.includes('handleAppearanceChange'),
    'Main process should import handleAppearanceChange'
  );
});

// =============================================================================
// PART 3: Verify handleAppearanceChange sends event to renderer
// =============================================================================

console.log('\n--- Part 3: Renderer Event Notification ---\n');

const ipcHandlersPath = path.join(__dirname, 'src/main/ipcHandlers.ts');
const ipcHandlersContent = fs.readFileSync(ipcHandlersPath, 'utf-8');

test('ipcHandlers exports handleAppearanceChange', () => {
  assert(
    ipcHandlersContent.includes('export async function handleAppearanceChange'),
    'ipcHandlers should export handleAppearanceChange function'
  );
});

test('handleAppearanceChange is an async function', () => {
  const functionMatch = ipcHandlersContent.match(
    /export\s+async\s+function\s+handleAppearanceChange\s*\([^)]*\)\s*:\s*Promise/
  );
  assert(
    functionMatch,
    'handleAppearanceChange should be an async function returning Promise'
  );
});

// Check if handleAppearanceChange sends event to renderer
test('handleAppearanceChange imports BrowserWindow (EXPECTED TO FAIL)', () => {
  const handleAppearanceChangeFunction = ipcHandlersContent.match(
    /export async function handleAppearanceChange[\s\S]*?^}/m
  );

  if (handleAppearanceChangeFunction) {
    const functionBody = handleAppearanceChangeFunction[0];
    assert(
      functionBody.includes('BrowserWindow'),
      'handleAppearanceChange should import/use BrowserWindow to send events'
    );
  } else {
    throw new Error('Could not extract handleAppearanceChange function body');
  }
});

test('handleAppearanceChange sends system:appearance-changed event (EXPECTED TO FAIL)', () => {
  const handleAppearanceChangeFunction = ipcHandlersContent.match(
    /export async function handleAppearanceChange[\s\S]*?^}/m
  );

  if (handleAppearanceChangeFunction) {
    const functionBody = handleAppearanceChangeFunction[0];
    assert(
      functionBody.includes('webContents.send') &&
      functionBody.includes('system:appearance-changed'),
      'handleAppearanceChange should send system:appearance-changed event to all windows'
    );
  } else {
    throw new Error('Could not extract handleAppearanceChange function body');
  }
});

test('handleAppearanceChange sends current appearance value (EXPECTED TO FAIL)', () => {
  const handleAppearanceChangeFunction = ipcHandlersContent.match(
    /export async function handleAppearanceChange[\s\S]*?^}/m
  );

  if (handleAppearanceChangeFunction) {
    const functionBody = handleAppearanceChangeFunction[0];
    // Should call handleGetSystemAppearance and send its value
    assert(
      functionBody.includes('handleGetSystemAppearance') &&
      functionBody.includes('webContents.send'),
      'handleAppearanceChange should get current appearance and send it via event'
    );
  } else {
    throw new Error('Could not extract handleAppearanceChange function body');
  }
});

// =============================================================================
// SUMMARY
// =============================================================================

console.log('\n' + '='.repeat(80));
console.log('TEST SUMMARY');
console.log('='.repeat(80));
console.log(`Total Tests: ${testCount}`);
console.log(`✅ Passed: ${passCount}`);
console.log(`❌ Failed: ${failCount}`);
console.log('='.repeat(80));

if (failCount > 0) {
  console.log('\n⚠️  IMPLEMENTATION REQUIRED ⚠️');
  console.log('\nThe onAppearanceChange API is exposed in preload and main listens to');
  console.log('nativeTheme events, but handleAppearanceChange does NOT send events to');
  console.log('the renderer process.');
  console.log('\nRequired implementation:');
  console.log('1. Import BrowserWindow in handleAppearanceChange');
  console.log('2. Get all windows: BrowserWindow.getAllWindows()');
  console.log('3. Send event to each window:');
  console.log("   window.webContents.send('system:appearance-changed', appearance)");
  console.log('4. This allows renderer to subscribe via onAppearanceChange callback');
  process.exit(1);
} else {
  console.log('\n✅ ALL TESTS PASSED');
  console.log('\nThe system:on-appearance-change event subscription is fully implemented!');
  process.exit(0);
}
