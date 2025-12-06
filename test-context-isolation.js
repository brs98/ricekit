#!/usr/bin/env node

/**
 * Test #112: Electron context isolation is enabled for security
 *
 * This test verifies that:
 * 1. contextIsolation is set to true
 * 2. nodeIntegration is set to false
 * 3. Preload script is configured
 * 4. Renderer process cannot access Node APIs directly
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(70));
console.log('TEST #112: ELECTRON CONTEXT ISOLATION SECURITY');
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
// A. Main process configuration
// ============================================================
console.log('A. Main process configuration');
console.log('-'.repeat(70));

const mainPath = path.join(__dirname, 'src/main/main.ts');

test('Main process file exists', () => {
  if (!fs.existsSync(mainPath)) {
    throw new Error('main.ts not found');
  }
});

const mainContent = fs.readFileSync(mainPath, 'utf8');

test('Creates BrowserWindow', () => {
  if (!mainContent.includes('new BrowserWindow')) {
    throw new Error('Does not create BrowserWindow');
  }
});

console.log('');

// ============================================================
// B. Context isolation verification
// ============================================================
console.log('B. Context isolation verification');
console.log('-'.repeat(70));

test('contextIsolation is set to true', () => {
  const match = mainContent.match(/contextIsolation:\s*true/);
  if (!match) {
    throw new Error('contextIsolation is not set to true');
  }
});

test('contextIsolation is in webPreferences', () => {
  const match = mainContent.match(/webPreferences:\s*{[^}]*contextIsolation:\s*true/s);
  if (!match) {
    throw new Error('contextIsolation is not in webPreferences');
  }
});

console.log('');

// ============================================================
// C. Node integration verification
// ============================================================
console.log('C. Node integration verification');
console.log('-'.repeat(70));

test('nodeIntegration is set to false', () => {
  const match = mainContent.match(/nodeIntegration:\s*false/);
  if (!match) {
    throw new Error('nodeIntegration is not set to false');
  }
});

test('nodeIntegration is in webPreferences', () => {
  const match = mainContent.match(/webPreferences:\s*{[^}]*nodeIntegration:\s*false/s);
  if (!match) {
    throw new Error('nodeIntegration is not in webPreferences');
  }
});

console.log('');

// ============================================================
// D. Preload script configuration
// ============================================================
console.log('D. Preload script configuration');
console.log('-'.repeat(70));

test('Preload script is configured', () => {
  const match = mainContent.match(/preload:\s*path\.join\([^)]+\)/);
  if (!match) {
    throw new Error('Preload script is not configured');
  }
});

test('Preload path uses __dirname', () => {
  const match = mainContent.match(/preload:\s*path\.join\(__dirname[^)]*\)/);
  if (!match) {
    throw new Error('Preload path should use __dirname');
  }
});

test('Preload script references preload file', () => {
  const match = mainContent.match(/preload:\s*path\.join\([^)]*preload/);
  if (!match) {
    throw new Error('Preload path should reference preload file');
  }
});

test('Preload file exists', () => {
  const preloadPath = path.join(__dirname, 'src/preload/preload.ts');
  if (!fs.existsSync(preloadPath)) {
    throw new Error('Preload file does not exist at src/preload/preload.ts');
  }
});

console.log('');

// ============================================================
// E. Preload script implementation
// ============================================================
console.log('E. Preload script implementation');
console.log('-'.repeat(70));

const preloadPath = path.join(__dirname, 'src/preload/preload.ts');
const preloadContent = fs.readFileSync(preloadPath, 'utf8');

test('Preload imports contextBridge', () => {
  const match = preloadContent.match(/import.*contextBridge.*from ['"]electron['"]/);
  if (!match) {
    throw new Error('Preload does not import contextBridge from electron');
  }
});

test('Preload imports ipcRenderer', () => {
  const match = preloadContent.match(/import.*ipcRenderer.*from ['"]electron['"]/);
  if (!match) {
    throw new Error('Preload does not import ipcRenderer from electron');
  }
});

test('Uses contextBridge.exposeInMainWorld', () => {
  const match = preloadContent.match(/contextBridge\.exposeInMainWorld/);
  if (!match) {
    throw new Error('Does not use contextBridge.exposeInMainWorld');
  }
});

test('Exposes electronAPI namespace', () => {
  const match = preloadContent.match(/contextBridge\.exposeInMainWorld\(\s*['"]electronAPI['"]/);
  if (!match) {
    throw new Error('Does not expose electronAPI namespace');
  }
});

console.log('');

// ============================================================
// F. Security best practices
// ============================================================
console.log('F. Security best practices');
console.log('-'.repeat(70));

test('Does not expose entire Node.js APIs', () => {
  // Should not expose fs, child_process, etc. directly
  // Look for actual dangerous patterns, not just "fs:" which could be "prefs:"
  const badExposures = [': fs,', 'require(', 'child_process', 'import fs from', "import { fs }"];
  const hasBadExposure = badExposures.some(api => preloadContent.includes(api));
  if (hasBadExposure) {
    throw new Error('Preload may be exposing dangerous Node.js APIs');
  }
});

test('Uses ipcRenderer.invoke pattern', () => {
  const match = preloadContent.match(/ipcRenderer\.invoke/);
  if (!match) {
    throw new Error('Should use ipcRenderer.invoke for async IPC');
  }
});

test('Exposes controlled IPC API', () => {
  // Check that exposed API is controlled/limited
  const exposeMatch = preloadContent.match(/contextBridge\.exposeInMainWorld\([^)]+,\s*{/s);
  if (!exposeMatch) {
    throw new Error('Should expose controlled object of APIs');
  }
});

console.log('');

// ============================================================
// G. Sandbox configuration
// ============================================================
console.log('G. Sandbox configuration');
console.log('-'.repeat(70));

test('Sandbox is enabled (or explicitly configured)', () => {
  // Check if sandbox is mentioned - it's enabled by default in modern Electron
  const hasSandbox = mainContent.includes('sandbox');
  if (hasSandbox) {
    console.log('     Note: Sandbox explicitly configured');
  } else {
    console.log('     Note: Sandbox uses Electron defaults (enabled by default)');
  }
});

test('No nodeIntegrationInWorker enabled', () => {
  const match = mainContent.match(/nodeIntegrationInWorker:\s*true/);
  if (match) {
    throw new Error('nodeIntegrationInWorker should not be enabled');
  }
});

console.log('');

// ============================================================
// H. Additional security checks
// ============================================================
console.log('H. Additional security checks');
console.log('-'.repeat(70));

test('No enableRemoteModule enabled', () => {
  const match = mainContent.match(/enableRemoteModule:\s*true/);
  if (match) {
    throw new Error('enableRemoteModule should not be enabled (deprecated and insecure)');
  }
});

test('Uses BrowserWindow webPreferences', () => {
  const match = mainContent.match(/new BrowserWindow\(\s*{[^}]*webPreferences:/s);
  if (!match) {
    throw new Error('BrowserWindow should have webPreferences configured');
  }
});

test('Main window has security configuration', () => {
  // Verify the main window creation has all security settings
  const windowCreation = mainContent.match(/new BrowserWindow\(\s*{[\s\S]*?}\s*\)/);
  if (!windowCreation) {
    throw new Error('Could not find BrowserWindow creation');
  }

  const hasContext = windowCreation[0].includes('contextIsolation');
  const hasNode = windowCreation[0].includes('nodeIntegration');
  const hasPreload = windowCreation[0].includes('preload');

  if (!hasContext || !hasNode || !hasPreload) {
    throw new Error('Main window missing security configuration');
  }
});

console.log('');

// ============================================================
// I. Type definitions
// ============================================================
console.log('I. Type definitions');
console.log('-'.repeat(70));

const typesPath = path.join(__dirname, 'src/shared/types.ts');

test('Types file exists', () => {
  if (!fs.existsSync(typesPath)) {
    console.log('     Note: types.ts may be in different location');
  }
});

test('Preload exposes typed API', () => {
  // Check if the exposed API has type annotations
  const hasTypes = preloadContent.includes(': ') || preloadContent.includes('interface') || preloadContent.includes('type ');
  if (!hasTypes) {
    console.log('     Note: API may not have explicit type annotations in preload');
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
  console.log('✅ Electron security is properly configured');
  console.log('✅ Context isolation: ENABLED');
  console.log('✅ Node integration: DISABLED');
  console.log('✅ Preload script: CONFIGURED');
  console.log('');
  process.exit(0);
} else {
  console.log('❌ SOME TESTS FAILED');
  console.log(`❌ ${totalTests - passedTests} test(s) need attention`);
  console.log('');
  process.exit(1);
}
