/**
 * Final hook script test with mocked Electron environment
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('=== Final Hook Script Test ===\n');

// Path to hook log file
const logPath = path.join(os.homedir(), 'Library/Application Support/MacTheme/hook-log.txt');

// Clear any previous log
if (fs.existsSync(logPath)) {
  fs.unlinkSync(logPath);
  console.log('✓ Cleared previous hook log\n');
}

// Mock Electron's app object for directories.js
const mockApp = {
  getPath: (name) => {
    if (name === 'userData') {
      return path.join(os.homedir(), 'Library/Application Support/MacTheme');
    }
    return os.homedir();
  }
};

// Mock Electron module
global.electronMock = { app: mockApp };

// Patch require to return mock for electron
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  if (id === 'electron') {
    return global.electronMock;
  }
  return originalRequire.apply(this, arguments);
};

async function test() {
  try {
    console.log('Loading IPC handlers with mocked Electron...');

    // Import the handler
    const { handleApplyTheme } = require('./dist/main/ipcHandlers.js');

    console.log('✓ IPC handlers loaded\n');
    console.log('=== Applying Theme: rose-pine ===\n');

    // Call the handler
    await handleApplyTheme(null, 'rose-pine');

    console.log('✓ Theme application completed\n');

    // Wait for hook script to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if hook was executed
    console.log('=== Checking Hook Log ===\n');

    if (fs.existsSync(logPath)) {
      const logContent = fs.readFileSync(logPath, 'utf-8');
      console.log('Hook Log Content:');
      console.log(logContent);

      if (logContent.includes('Hook script executed') && logContent.includes('rose-pine')) {
        console.log('\n✅ SUCCESS: Hook script executed correctly!');
        console.log('✅ Hook script received theme name: rose-pine');
        console.log('\n=== Test #92: PASSED ===');
        process.exit(0);
      } else {
        console.log('\n❌ FAILED: Hook log missing expected content');
        process.exit(1);
      }
    } else {
      console.log('❌ FAILED: Hook script was not executed (no log file)');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

test();
