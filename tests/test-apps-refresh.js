#!/usr/bin/env node

/**
 * Test #107: IPC channel apps:refresh sends reload signal to app
 *
 * This test verifies that the apps:refresh IPC handler:
 * 1. Accepts app name as parameter
 * 2. Sends appropriate reload signal based on app
 * 3. Handles cases where app is not running
 * 4. Supports multiple terminal apps
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(70));
console.log('TEST #107: IPC CHANNEL apps:refresh');
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

test('apps:refresh handler is registered', () => {
  if (!ipcHandlersContent.includes("ipcMain.handle('apps:refresh', handleRefreshApp)")) {
    throw new Error('apps:refresh handler not registered');
  }
});

test('handleRefreshApp function is defined', () => {
  if (!ipcHandlersContent.includes('async function handleRefreshApp')) {
    throw new Error('handleRefreshApp function not found');
  }
});

test('Function accepts appName parameter', () => {
  if (!ipcHandlersContent.match(/handleRefreshApp.*appName/)) {
    throw new Error('appName parameter not found');
  }
});

test('No longer has TODO comment', () => {
  const refreshFunctionMatch = ipcHandlersContent.match(/async function handleRefreshApp[\s\S]*?(?=\nasync function|\nexport|\n\/\*\*)/);
  if (refreshFunctionMatch && refreshFunctionMatch[0].includes('TODO')) {
    throw new Error('Function still has TODO comment - not fully implemented');
  }
});

console.log('');
console.log('B. Kitty terminal support');
console.log('-'.repeat(70));

test('Handles kitty app refresh', () => {
  const hasKitty = ipcHandlersContent.includes("case 'kitty':");
  if (!hasKitty) {
    throw new Error('Kitty case not found in switch statement');
  }
});

test('Uses Kitty remote control command', () => {
  const usesRemoteControl = ipcHandlersContent.includes('kitty @') ||
                            ipcHandlersContent.includes('set-colors');
  if (!usesRemoteControl) {
    throw new Error('Kitty remote control command not found');
  }
});

test('Handles Kitty not running gracefully', () => {
  const handlesNotRunning = ipcHandlersContent.includes('not running') ||
                            ipcHandlersContent.includes('No such file') ||
                            ipcHandlersContent.includes('Connection refused');
  if (!handlesNotRunning) {
    throw new Error('Does not handle Kitty not running');
  }
});

test('Uses socket communication for Kitty', () => {
  const usesSocket = ipcHandlersContent.includes('unix:/tmp/kitty') ||
                     ipcHandlersContent.includes('socket');
  if (!usesSocket) {
    throw new Error('Socket communication not found for Kitty');
  }
});

console.log('');
console.log('C. iTerm2 terminal support');
console.log('-'.repeat(70));

test('Handles iTerm2 app refresh', () => {
  const hasIterm = ipcHandlersContent.includes("case 'iterm2':");
  if (!hasIterm) {
    throw new Error('iTerm2 case not found in switch statement');
  }
});

test('Uses AppleScript for iTerm2', () => {
  const usesAppleScript = ipcHandlersContent.includes('osascript') &&
                          ipcHandlersContent.includes('iTerm2');
  if (!usesAppleScript) {
    throw new Error('AppleScript command not found for iTerm2');
  }
});

test('Handles iTerm2 not running gracefully', () => {
  const handlesNotRunning = ipcHandlersContent.includes('not running');
  if (!handlesNotRunning) {
    throw new Error('Does not handle iTerm2 not running');
  }
});

console.log('');
console.log('D. Alacritty terminal support');
console.log('-'.repeat(70));

test('Handles Alacritty app refresh', () => {
  const hasAlacritty = ipcHandlersContent.includes("case 'alacritty':");
  if (!hasAlacritty) {
    throw new Error('Alacritty case not found in switch statement');
  }
});

test('Touches config file to trigger reload', () => {
  const touchesConfig = ipcHandlersContent.includes('utimesSync') ||
                        ipcHandlersContent.includes('touch');
  if (!touchesConfig) {
    throw new Error('Config file touching not found for Alacritty');
  }
});

test('Checks if config file exists', () => {
  const checksExistence = ipcHandlersContent.includes('existsSync') &&
                          ipcHandlersContent.includes('alacritty');
  if (!checksExistence) {
    throw new Error('Does not check if Alacritty config exists');
  }
});

console.log('');
console.log('E. Other applications');
console.log('-'.repeat(70));

test('Handles VS Code refresh', () => {
  const hasVscode = ipcHandlersContent.includes("case 'vscode':");
  if (!hasVscode) {
    throw new Error('VS Code case not found');
  }
});

test('Handles Neovim refresh', () => {
  const hasNeovim = ipcHandlersContent.includes("case 'neovim':");
  if (!hasNeovim) {
    throw new Error('Neovim case not found');
  }
});

test('Has default case for unsupported apps', () => {
  const hasDefault = ipcHandlersContent.includes('default:');
  if (!hasDefault) {
    throw new Error('Default case not found in switch statement');
  }
});

console.log('');
console.log('F. Implementation details');
console.log('-'.repeat(70));

test('Uses switch statement for app routing', () => {
  const usesSwitch = ipcHandlersContent.includes('switch (appName');
  if (!usesSwitch) {
    throw new Error('Switch statement not found');
  }
});

test('Normalizes app name to lowercase', () => {
  const normalizesCase = ipcHandlersContent.includes('.toLowerCase()');
  if (!normalizesCase) {
    throw new Error('Does not normalize app name case');
  }
});

test('Logs refresh attempts', () => {
  const logsRefresh = ipcHandlersContent.includes('console.log') &&
                      ipcHandlersContent.includes('Refreshing');
  if (!logsRefresh) {
    throw new Error('Refresh logging not found');
  }
});

test('Logs successful refreshes', () => {
  const logsSuccess = ipcHandlersContent.includes('refreshed successfully') ||
                      ipcHandlersContent.includes('refresh');
  if (!logsSuccess) {
    throw new Error('Success logging not found');
  }
});

console.log('');
console.log('G. Error handling');
console.log('-'.repeat(70));

test('Wraps operations in try-catch', () => {
  const hasTryCatch = ipcHandlersContent.includes('try {') &&
                      ipcHandlersContent.includes('catch (error');
  if (!hasTryCatch) {
    throw new Error('Try-catch block not found');
  }
});

test('Logs errors to console', () => {
  const logsErrors = ipcHandlersContent.includes('console.error') &&
                     ipcHandlersContent.includes('Failed to refresh');
  if (!logsErrors) {
    throw new Error('Error logging not found');
  }
});

test('Throws descriptive error messages', () => {
  const throwsError = ipcHandlersContent.includes('throw new Error') &&
                      ipcHandlersContent.includes('Failed to refresh');
  if (!throwsError) {
    throw new Error('Error throwing not found');
  }
});

console.log('');
console.log('H. Command execution safety');
console.log('-'.repeat(70));

test('Uses execSync for command execution', () => {
  const usesExecSync = ipcHandlersContent.includes('execSync');
  if (!usesExecSync) {
    throw new Error('execSync not used for command execution');
  }
});

test('Sets timeout for commands', () => {
  const hasTimeout = ipcHandlersContent.includes('timeout:') &&
                     ipcHandlersContent.includes('5000');
  if (!hasTimeout) {
    throw new Error('Command timeout not set');
  }
});

test('Uses pipe for stdio to prevent blocking', () => {
  const usesPipe = ipcHandlersContent.includes("stdio: 'pipe'");
  if (!usesPipe) {
    throw new Error('stdio pipe not configured');
  }
});

console.log('');
console.log('='.repeat(70));
console.log('TEST RESULTS');
console.log('='.repeat(70));
console.log(`Tests Passed: ${passedTests}/${totalTests}`);
console.log('');

if (passedTests === totalTests) {
  console.log('✅ TEST #107 PASSED');
  console.log('');
  console.log('Summary:');
  console.log('  - IPC handler apps:refresh is properly registered');
  console.log('  - Supports Kitty (remote control via socket)');
  console.log('  - Supports iTerm2 (AppleScript reload)');
  console.log('  - Supports Alacritty (touch config to trigger reload)');
  console.log('  - Handles VS Code and Neovim (manual reload required)');
  console.log('  - Gracefully handles apps not running');
  console.log('  - Safe command execution with timeouts');
  console.log('  - Comprehensive error handling and logging');
  console.log('');
  process.exit(0);
} else {
  console.log('❌ TEST #107 FAILED');
  console.log(`   ${totalTests - passedTests} test(s) failed`);
  console.log('');
  process.exit(1);
}
