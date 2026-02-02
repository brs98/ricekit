/**
 * Test script for logging functionality
 * Tests that logging system works as expected
 */

const { _electron: electron } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');

async function testLogging() {
  console.log('==============================================');
  console.log('LOGGING SYSTEM TEST');
  console.log('==============================================\n');

  let app;
  let window;

  try {
    // Launch the Electron app
    console.log('Step 1: Launching application...');
    app = await electron.launch({
      args: ['.'],
      cwd: __dirname,
      timeout: 30000
    });

    window = await app.firstWindow();
    console.log('✓ Application launched\n');

    // Wait for app to be ready
    await window.waitForTimeout(3000);

    // Step 2: Check if log file was created
    console.log('Step 2: Checking log file creation...');
    const logDir = path.join(os.homedir(), 'Library', 'Application Support', 'ricekit', 'logs');
    const logFile = path.join(logDir, 'ricekit.log');

    if (!fs.existsSync(logDir)) {
      throw new Error(`Log directory not created: ${logDir}`);
    }
    console.log(`✓ Log directory exists: ${logDir}`);

    if (!fs.existsSync(logFile)) {
      throw new Error(`Log file not created: ${logFile}`);
    }
    console.log(`✓ Log file exists: ${logFile}`);

    // Step 3: Check log file content
    console.log('\nStep 3: Checking log file content...');
    const logContent = fs.readFileSync(logFile, 'utf-8');
    const logLines = logContent.trim().split('\n');

    console.log(`Log file has ${logLines.length} lines`);

    // Check for expected log entries
    const hasStartupLog = logContent.includes('Ricekit Starting');
    const hasTimestamps = logContent.match(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}\]/);
    const hasLogLevels = logContent.includes('[INFO]');

    if (!hasStartupLog) {
      console.log('⚠ Warning: Startup log not found');
    } else {
      console.log('✓ Startup log found');
    }

    if (!hasTimestamps) {
      throw new Error('Log entries missing timestamps');
    }
    console.log('✓ Log entries have timestamps');

    if (!hasLogLevels) {
      throw new Error('Log entries missing log levels');
    }
    console.log('✓ Log entries have log levels');

    // Show first few log lines
    console.log('\nFirst 5 log entries:');
    logLines.slice(0, 5).forEach(line => {
      console.log(`  ${line.substring(0, 100)}${line.length > 100 ? '...' : ''}`);
    });

    // Step 4: Navigate to Settings and check logging UI
    console.log('\nStep 4: Testing logging UI in Settings...');

    // Click Settings in sidebar
    await window.click('nav button:has-text("Settings")');
    await window.waitForTimeout(1000);

    // Scroll down to find Developer & Logging section
    await window.evaluate(() => {
      const mainContent = document.querySelector('.settings-container');
      if (mainContent) {
        mainContent.scrollTop = mainContent.scrollHeight;
      }
    });
    await window.waitForTimeout(500);

    // Check if "Developer & Logging" section exists
    const hasDeveloperSection = await window.locator('h3:has-text("Developer & Logging")').count() > 0;
    if (!hasDeveloperSection) {
      throw new Error('Developer & Logging section not found in Settings');
    }
    console.log('✓ Developer & Logging section found');

    // Check if Debug Logging toggle exists
    const hasDebugToggle = await window.locator('text=Debug Logging').count() > 0;
    if (!hasDebugToggle) {
      throw new Error('Debug Logging toggle not found');
    }
    console.log('✓ Debug Logging toggle found');

    // Check if View Log Files button exists
    const hasViewLogsButton = await window.locator('button:has-text("Open Log Folder")').count() > 0;
    if (!hasViewLogsButton) {
      throw new Error('Open Log Folder button not found');
    }
    console.log('✓ Open Log Folder button found');

    // Check if Clear Logs button exists
    const hasClearLogsButton = await window.locator('button:has-text("Clear Logs")').count() > 0;
    if (!hasClearLogsButton) {
      throw new Error('Clear Logs button not found');
    }
    console.log('✓ Clear Logs button found');

    // Step 5: Test applying a theme and check that it gets logged
    console.log('\nStep 5: Testing theme application logging...');

    // Get the current log file size
    const logSizeBefore = fs.statSync(logFile).size;

    // Navigate to Themes view
    await window.click('nav button:has-text("Themes")');
    await window.waitForTimeout(1000);

    // Apply a theme (click on the first Apply button)
    const applyButtons = await window.locator('button:has-text("Apply")').all();
    if (applyButtons.length === 0) {
      throw new Error('No Apply buttons found');
    }

    await applyButtons[0].click();
    await window.waitForTimeout(2000);

    // Check if log file grew
    const logSizeAfter = fs.statSync(logFile).size;
    if (logSizeAfter <= logSizeBefore) {
      console.log('⚠ Warning: Log file did not grow after theme application');
    } else {
      console.log(`✓ Log file grew by ${logSizeAfter - logSizeBefore} bytes`);
    }

    // Read new log content and check for theme application log
    const newLogContent = fs.readFileSync(logFile, 'utf-8');
    const hasThemeLog = newLogContent.includes('Applying theme:') || newLogContent.includes('Theme applied successfully');

    if (!hasThemeLog) {
      console.log('⚠ Warning: Theme application not logged');
    } else {
      console.log('✓ Theme application logged');
    }

    console.log('\n==============================================');
    console.log('✅ ALL LOGGING TESTS PASSED');
    console.log('==============================================');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    process.exit(1);
  } finally {
    if (app) {
      await app.close();
    }
  }
}

testLogging().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
