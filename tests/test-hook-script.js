/**
 * Test script to verify hook script execution
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Initialize Electron
app.whenReady().then(async () => {
  console.log('Testing hook script execution...\n');

  // Import IPC handlers
  const { handleApplyTheme } = require('./dist/main.js');

  try {
    // Clear any previous log
    const logPath = path.join(
      process.env.HOME,
      'Library/Application Support/MacTheme/hook-log.txt'
    );
    if (fs.existsSync(logPath)) {
      fs.unlinkSync(logPath);
      console.log('Cleared previous hook log');
    }

    // Get initial log state
    console.log('\n=== Before Theme Application ===');
    console.log('Log file exists:', fs.existsSync(logPath));

    // Apply a theme (this should trigger the hook script)
    console.log('\n=== Applying Theme: dracula ===');
    await handleApplyTheme(null, 'dracula');
    console.log('Theme applied successfully');

    // Wait a moment for hook script to execute
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if hook script was executed
    console.log('\n=== After Theme Application ===');
    console.log('Log file exists:', fs.existsSync(logPath));

    if (fs.existsSync(logPath)) {
      const logContent = fs.readFileSync(logPath, 'utf-8');
      console.log('Hook log content:');
      console.log(logContent);

      // Verify log contains expected content
      if (logContent.includes('Hook script executed') && logContent.includes('dracula')) {
        console.log('\n✅ SUCCESS: Hook script was executed correctly!');
        console.log('✅ Hook script received theme name: dracula');
        app.exit(0);
      } else {
        console.log('\n❌ FAILED: Hook script log missing expected content');
        app.exit(1);
      }
    } else {
      console.log('\n❌ FAILED: Hook script was not executed (no log file)');
      app.exit(1);
    }
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    app.exit(1);
  }
});

app.on('window-all-closed', () => {
  // Don't quit on macOS
});
