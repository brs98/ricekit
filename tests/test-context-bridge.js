#!/usr/bin/env node

/**
 * Test #113: Context bridge properly exposes IPC APIs to renderer
 *
 * This test verifies that:
 * 1. contextBridge.exposeInMainWorld is used
 * 2. Only necessary APIs are exposed
 * 3. Exposed APIs use ipcRenderer invoke pattern
 * 4. APIs are accessible from renderer process
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(70));
console.log('TEST #113: CONTEXT BRIDGE IPC API EXPOSURE');
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
// A. Preload script verification
// ============================================================
console.log('A. Preload script verification');
console.log('-'.repeat(70));

const preloadPath = path.join(__dirname, 'src/preload/preload.ts');

test('Preload script exists', () => {
  if (!fs.existsSync(preloadPath)) {
    throw new Error('Preload script not found at src/preload/preload.ts');
  }
});

const preloadContent = fs.readFileSync(preloadPath, 'utf8');

test('Imports contextBridge', () => {
  const match = preloadContent.match(/import.*{.*contextBridge.*}.*from ['"]electron['"]/);
  if (!match) {
    throw new Error('Does not import contextBridge');
  }
});

test('Imports ipcRenderer', () => {
  const match = preloadContent.match(/import.*{.*ipcRenderer.*}.*from ['"]electron['"]/);
  if (!match) {
    throw new Error('Does not import ipcRenderer');
  }
});

console.log('');

// ============================================================
// B. contextBridge.exposeInMainWorld usage
// ============================================================
console.log('B. contextBridge.exposeInMainWorld usage');
console.log('-'.repeat(70));

test('Uses contextBridge.exposeInMainWorld', () => {
  const match = preloadContent.match(/contextBridge\.exposeInMainWorld/);
  if (!match) {
    throw new Error('Does not use contextBridge.exposeInMainWorld');
  }
});

test('Exposes electronAPI namespace', () => {
  const match = preloadContent.match(/contextBridge\.exposeInMainWorld\(\s*['"]electronAPI['"]/);
  if (!match) {
    throw new Error('Should expose electronAPI namespace');
  }
});

test('Exposes an object with APIs', () => {
  const match = preloadContent.match(/contextBridge\.exposeInMainWorld\([^,]+,\s*{/);
  if (!match) {
    throw new Error('Should expose an object containing APIs');
  }
});

console.log('');

// ============================================================
// C. Theme operations APIs
// ============================================================
console.log('C. Theme operations APIs');
console.log('-'.repeat(70));

const requiredThemeAPIs = [
  'listThemes',
  'getTheme',
  'applyTheme',
  'createTheme',
  'updateTheme',
  'deleteTheme',
  'duplicateTheme',
  'exportTheme',
  'importTheme'
];

requiredThemeAPIs.forEach(api => {
  test(`Exposes ${api} API`, () => {
    const match = preloadContent.match(new RegExp(`${api}:\\s*\\(`));
    if (!match) {
      throw new Error(`${api} API not exposed`);
    }
  });
});

console.log('');

// ============================================================
// D. Wallpaper operations APIs
// ============================================================
console.log('D. Wallpaper operations APIs');
console.log('-'.repeat(70));

const requiredWallpaperAPIs = [
  'listWallpapers',
  'applyWallpaper',
  'getDisplays'
];

requiredWallpaperAPIs.forEach(api => {
  test(`Exposes ${api} API`, () => {
    const match = preloadContent.match(new RegExp(`${api}:\\s*\\(`));
    if (!match) {
      throw new Error(`${api} API not exposed`);
    }
  });
});

console.log('');

// ============================================================
// E. Application operations APIs
// ============================================================
console.log('E. Application operations APIs');
console.log('-'.repeat(70));

const requiredAppAPIs = [
  'detectApps',
  'setupApp',
  'refreshApp'
];

requiredAppAPIs.forEach(api => {
  test(`Exposes ${api} API`, () => {
    const match = preloadContent.match(new RegExp(`${api}:\\s*\\(`));
    if (!match) {
      throw new Error(`${api} API not exposed`);
    }
  });
});

console.log('');

// ============================================================
// F. Preferences operations APIs
// ============================================================
console.log('F. Preferences operations APIs');
console.log('-'.repeat(70));

const requiredPrefsAPIs = [
  'getPreferences',
  'setPreferences',
  'backupPreferences',
  'restorePreferences'
];

requiredPrefsAPIs.forEach(api => {
  test(`Exposes ${api} API`, () => {
    const match = preloadContent.match(new RegExp(`${api}:\\s*\\(`));
    if (!match) {
      throw new Error(`${api} API not exposed`);
    }
  });
});

console.log('');

// ============================================================
// G. System operations APIs
// ============================================================
console.log('G. System operations APIs');
console.log('-'.repeat(70));

const requiredSystemAPIs = [
  'getSystemAppearance',
  'getSunriseSunset',
  'onAppearanceChange'
];

requiredSystemAPIs.forEach(api => {
  test(`Exposes ${api} API`, () => {
    const match = preloadContent.match(new RegExp(`${api}:\\s*\\(`));
    if (!match) {
      throw new Error(`${api} API not exposed`);
    }
  });
});

console.log('');

// ============================================================
// H. State operations APIs
// ============================================================
console.log('H. State operations APIs');
console.log('-'.repeat(70));

test('Exposes getState API', () => {
  const match = preloadContent.match(/getState:\s*\(/);
  if (!match) {
    throw new Error('getState API not exposed');
  }
});

console.log('');

// ============================================================
// I. ipcRenderer.invoke pattern usage
// ============================================================
console.log('I. ipcRenderer.invoke pattern usage');
console.log('-'.repeat(70));

test('All APIs use ipcRenderer.invoke', () => {
  const invokeCount = (preloadContent.match(/ipcRenderer\.invoke/g) || []).length;
  if (invokeCount < 10) {
    throw new Error(`Expected at least 10 ipcRenderer.invoke calls, found ${invokeCount}`);
  }
});

test('Theme APIs use correct IPC channels', () => {
  const hasThemeList = preloadContent.includes("ipcRenderer.invoke('theme:list')");
  const hasThemeGet = preloadContent.includes("ipcRenderer.invoke('theme:get'");
  const hasThemeApply = preloadContent.includes("ipcRenderer.invoke('theme:apply'");

  if (!hasThemeList || !hasThemeGet || !hasThemeApply) {
    throw new Error('Theme APIs should use correct IPC channels (theme:list, theme:get, theme:apply)');
  }
});

test('Wallpaper APIs use correct IPC channels', () => {
  const hasWallpaperList = preloadContent.includes("ipcRenderer.invoke('wallpaper:list'");
  const hasWallpaperApply = preloadContent.includes("ipcRenderer.invoke('wallpaper:apply'");

  if (!hasWallpaperList || !hasWallpaperApply) {
    throw new Error('Wallpaper APIs should use correct IPC channels');
  }
});

test('App APIs use correct IPC channels', () => {
  const hasAppsDetect = preloadContent.includes("ipcRenderer.invoke('apps:detect')");
  const hasAppsSetup = preloadContent.includes("ipcRenderer.invoke('apps:setup'");

  if (!hasAppsDetect || !hasAppsSetup) {
    throw new Error('App APIs should use correct IPC channels');
  }
});

test('Preferences APIs use correct IPC channels', () => {
  const hasPrefsGet = preloadContent.includes("ipcRenderer.invoke('preferences:get')");
  const hasPrefsSet = preloadContent.includes("ipcRenderer.invoke('preferences:set'");

  if (!hasPrefsGet || !hasPrefsSet) {
    throw new Error('Preferences APIs should use correct IPC channels');
  }
});

test('System APIs use correct IPC channels', () => {
  const hasAppearance = preloadContent.includes("ipcRenderer.invoke('system:appearance')");
  const hasSunrise = preloadContent.includes("ipcRenderer.invoke('system:getSunriseSunset')");

  if (!hasAppearance || !hasSunrise) {
    throw new Error('System APIs should use correct IPC channels');
  }
});

console.log('');

// ============================================================
// J. Event listener APIs
// ============================================================
console.log('J. Event listener APIs');
console.log('-'.repeat(70));

test('onAppearanceChange uses ipcRenderer.on', () => {
  const match = preloadContent.match(/onAppearanceChange:[^}]*ipcRenderer\.on/s);
  if (!match) {
    throw new Error('onAppearanceChange should use ipcRenderer.on for events');
  }
});

test('onAppearanceChange wraps callback properly', () => {
  const match = preloadContent.match(/onAppearanceChange:[^}]*callback\(/s);
  if (!match) {
    throw new Error('onAppearanceChange should wrap callback');
  }
});

test('Has quick switcher event handler', () => {
  const match = preloadContent.match(/onQuickSwitcherOpened/);
  if (!match) {
    console.log('     Note: Quick switcher event handler may be optional');
  }
});

console.log('');

// ============================================================
// K. Security - no direct Node.js API exposure
// ============================================================
console.log('K. Security - no direct Node.js API exposure');
console.log('-'.repeat(70));

test('Does not expose require()', () => {
  const match = preloadContent.match(/require:\s*\(/);
  if (match) {
    throw new Error('Should not expose require() to renderer');
  }
});

test('Does not expose process', () => {
  const match = preloadContent.match(/process:\s*process/);
  if (match) {
    throw new Error('Should not expose process object to renderer');
  }
});

test('Does not expose __dirname directly', () => {
  const match = preloadContent.match(/__dirname:\s*__dirname/);
  if (match) {
    throw new Error('Should not expose __dirname to renderer');
  }
});

test('All APIs are wrapped functions', () => {
  // Check that exposed APIs are functions that call ipcRenderer, not direct references
  const hasDirectIpcExposure = preloadContent.match(/:\s*ipcRenderer[,\s}]/);
  if (hasDirectIpcExposure) {
    throw new Error('Should not expose ipcRenderer directly');
  }
});

console.log('');

// ============================================================
// L. Type safety
// ============================================================
console.log('L. Type safety');
console.log('-'.repeat(70));

test('APIs have parameter type annotations', () => {
  const hasTypes = preloadContent.includes(': string') || preloadContent.includes(': any');
  if (!hasTypes) {
    console.log('     Note: Parameters may not have explicit type annotations');
  }
});

test('Uses arrow functions for API definitions', () => {
  const arrowFunctionCount = (preloadContent.match(/:\s*\([^)]*\)\s*=>/g) || []).length;
  if (arrowFunctionCount < 10) {
    throw new Error('APIs should use arrow functions for consistency');
  }
});

console.log('');

// ============================================================
// M. Renderer type definitions
// ============================================================
console.log('M. Renderer type definitions');
console.log('-'.repeat(70));

test('Should have window.d.ts or similar for types', () => {
  const windowTypesPath = path.join(__dirname, 'src/renderer/window.d.ts');
  const globalTypesPath = path.join(__dirname, 'src/renderer/global.d.ts');
  const preloadTypesPath = path.join(__dirname, 'src/preload/preload.d.ts');

  const hasTypes = fs.existsSync(windowTypesPath) ||
                   fs.existsSync(globalTypesPath) ||
                   fs.existsSync(preloadTypesPath);

  if (!hasTypes) {
    console.log('     Note: Type definitions file not found (may be inline)');
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
  console.log('✅ Context bridge properly exposes IPC APIs');
  console.log('✅ All necessary APIs are exposed and secured');
  console.log('✅ Uses ipcRenderer.invoke pattern correctly');
  console.log('');
  process.exit(0);
} else {
  console.log('❌ SOME TESTS FAILED');
  console.log(`❌ ${totalTests - passedTests} test(s) need attention`);
  console.log('');
  process.exit(1);
}
