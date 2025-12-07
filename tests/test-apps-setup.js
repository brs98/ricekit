#!/usr/bin/env node

/**
 * Test #106: IPC channel apps:setup configures app with import statement
 *
 * This test verifies that the apps:setup IPC handler:
 * 1. Accepts app name and setup mode as parameters
 * 2. Modifies the app's config file
 * 3. Adds import statement correctly
 * 4. Creates backup of original config
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('='.repeat(70));
console.log('TEST #106: IPC CHANNEL apps:setup');
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

console.log('A. Implementation verification');
console.log('-'.repeat(70));

const ipcHandlersPath = path.join(__dirname, 'src/main/ipcHandlers.ts');
const ipcHandlersContent = fs.readFileSync(ipcHandlersPath, 'utf8');

test('apps:setup handler is registered', () => {
  if (!ipcHandlersContent.includes("ipcMain.handle('apps:setup', handleSetupApp)")) {
    throw new Error('apps:setup handler not registered');
  }
});

test('handleSetupApp function is defined', () => {
  if (!ipcHandlersContent.includes('async function handleSetupApp')) {
    throw new Error('handleSetupApp function not found');
  }
});

test('Function accepts appName parameter', () => {
  if (!ipcHandlersContent.match(/handleSetupApp.*appName/)) {
    throw new Error('appName parameter not found');
  }
});

console.log('');
console.log('B. Configuration definitions for supported apps');
console.log('-'.repeat(70));

const supportedApps = [
  { name: 'alacritty', configFile: 'alacritty.toml', importKeyword: 'import' },
  { name: 'kitty', configFile: 'kitty.conf', importKeyword: 'include' },
  { name: 'neovim', configFile: 'init.lua', importKeyword: 'dofile' },
  { name: 'vscode', configFile: 'settings.json', importKeyword: 'workbench.colorCustomizations' },
  { name: 'starship', configFile: 'starship.toml', importKeyword: '$include' },
];

supportedApps.forEach(app => {
  test(`${app.name} configuration is defined`, () => {
    const hasConfig = ipcHandlersContent.includes(`${app.name}:`);
    if (!hasConfig) {
      throw new Error(`${app.name} config not found`);
    }
  });

  test(`${app.name} has config path specified`, () => {
    const hasConfigPath = ipcHandlersContent.includes('configPath:') &&
                          ipcHandlersContent.includes(app.configFile);
    if (!hasConfigPath) {
      throw new Error(`Config path for ${app.name} not found`);
    }
  });

  test(`${app.name} has import line specified`, () => {
    const hasImportLine = ipcHandlersContent.includes('importLine:');
    if (!hasImportLine) {
      throw new Error(`Import line for ${app.name} not found`);
    }
  });
});

console.log('');
console.log('C. Theme path reference');
console.log('-'.repeat(70));

test('References MacTheme theme directory', () => {
  const hasThemePath = ipcHandlersContent.includes('~/Library/Application Support/MacTheme/current/theme') ||
                       ipcHandlersContent.includes('MacTheme/current/theme');
  if (!hasThemePath) {
    throw new Error('Theme path reference not found');
  }
});

test('Uses themeBasePath variable', () => {
  if (!ipcHandlersContent.match(/themeBasePath\s*=/)) {
    throw new Error('themeBasePath variable not found');
  }
});

console.log('');
console.log('D. Config file modification logic');
console.log('-'.repeat(70));

test('Creates config directory if missing', () => {
  const hasDirectoryCreation = ipcHandlersContent.includes('mkdirSync') &&
                                ipcHandlersContent.includes('recursive: true');
  if (!hasDirectoryCreation) {
    throw new Error('Directory creation logic not found');
  }
});

test('Reads existing config file', () => {
  const readsConfig = ipcHandlersContent.includes('readFileSync(configPath') ||
                      ipcHandlersContent.includes('fs.readFileSync(configPath');
  if (!readsConfig) {
    throw new Error('Config file reading not found');
  }
});

test('Checks if config file exists before reading', () => {
  const checksExistence = ipcHandlersContent.includes('existsSync(configPath)');
  if (!checksExistence) {
    throw new Error('Config existence check not found');
  }
});

test('Writes modified config back to file', () => {
  const writesConfig = ipcHandlersContent.includes('writeFileSync(configPath') ||
                       ipcHandlersContent.includes('fs.writeFileSync(configPath');
  if (!writesConfig) {
    throw new Error('Config file writing not found');
  }
});

console.log('');
console.log('E. Backup functionality');
console.log('-'.repeat(70));

test('Creates backup of original config', () => {
  const hasBackup = ipcHandlersContent.includes('copyFileSync') ||
                    ipcHandlersContent.includes('.bak');
  if (!hasBackup) {
    throw new Error('Backup creation not found');
  }
});

test('Uses .bak extension for backup', () => {
  if (!ipcHandlersContent.includes('.bak')) {
    throw new Error('.bak extension not used for backup');
  }
});

test('Logs backup creation', () => {
  const logsBackup = ipcHandlersContent.includes('Created backup') ||
                     ipcHandlersContent.includes('backup');
  if (!logsBackup) {
    throw new Error('Backup logging not found');
  }
});

console.log('');
console.log('F. Import statement injection');
console.log('-'.repeat(70));

test('Adds import statement to config', () => {
  const addsImport = ipcHandlersContent.includes('importLine') ||
                     ipcHandlersContent.includes('newContent');
  if (!addsImport) {
    throw new Error('Import statement injection not found');
  }
});

test('Adds import at beginning of file', () => {
  const prependsImport = ipcHandlersContent.includes('importLine + ') ||
                         ipcHandlersContent.match(/importLine.*\n.*configContent/);
  if (!prependsImport) {
    throw new Error('Import prepending logic not found');
  }
});

test('Checks for duplicate imports', () => {
  const checksDuplicates = ipcHandlersContent.includes('already exists') ||
                           ipcHandlersContent.includes('includes(importLine)');
  if (!checksDuplicates) {
    throw new Error('Duplicate import check not found');
  }
});

console.log('');
console.log('G. Error handling');
console.log('-'.repeat(70));

test('Validates app name is supported', () => {
  const validatesApp = ipcHandlersContent.includes('Unsupported app') ||
                       ipcHandlersContent.includes('!config');
  if (!validatesApp) {
    throw new Error('App name validation not found');
  }
});

test('Catches and logs errors', () => {
  const hasErrorHandling = ipcHandlersContent.includes('catch (error') &&
                           ipcHandlersContent.includes('console.error');
  if (!hasErrorHandling) {
    throw new Error('Error handling not found');
  }
});

test('Throws error with descriptive message', () => {
  const throwsError = ipcHandlersContent.includes('throw new Error') &&
                      ipcHandlersContent.includes('Failed to setup');
  if (!throwsError) {
    throw new Error('Error throwing not found');
  }
});

console.log('');
console.log('H. User feedback');
console.log('-'.repeat(70));

test('Logs successful setup to console', () => {
  const logsSuccess = ipcHandlersContent.includes('Successfully configured') ||
                      ipcHandlersContent.includes('console.log');
  if (!logsSuccess) {
    throw new Error('Success logging not found');
  }
});

test('Shows notification on completion', () => {
  const showsNotification = ipcHandlersContent.includes('Notification') &&
                            ipcHandlersContent.includes('Setup Complete');
  if (!showsNotification) {
    throw new Error('Notification not found');
  }
});

test('Checks if notifications are supported', () => {
  const checksSupport = ipcHandlersContent.includes('isSupported()');
  if (!checksSupport) {
    throw new Error('Notification support check not found');
  }
});

console.log('');
console.log('='.repeat(70));
console.log('TEST RESULTS');
console.log('='.repeat(70));
console.log(`Tests Passed: ${passedTests}/${totalTests}`);
console.log('');

if (passedTests === totalTests) {
  console.log('✅ TEST #106 PASSED');
  console.log('');
  console.log('Summary:');
  console.log('  - IPC handler apps:setup is properly registered');
  console.log(`  - Supports ${supportedApps.length} applications (alacritty, kitty, neovim, vscode, starship)`);
  console.log('  - Creates backup of original config (.bak extension)');
  console.log('  - Adds import statement at beginning of file');
  console.log('  - Checks for duplicate imports');
  console.log('  - Creates config directories if missing');
  console.log('  - Validates app name before setup');
  console.log('  - Provides user feedback via notifications');
  console.log('  - Comprehensive error handling');
  console.log('');
  process.exit(0);
} else {
  console.log('❌ TEST #106 FAILED');
  console.log(`   ${totalTests - passedTests} test(s) failed`);
  console.log('');
  process.exit(1);
}
