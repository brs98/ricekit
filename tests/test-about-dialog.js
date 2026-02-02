#!/usr/bin/env node

/**
 * Test About Dialog - Test #130
 * Verifies that the About dialog displays correctly with app info
 */

const { _electron: electron } = require('playwright');
const path = require('path');

async function runTest() {
  console.log('🧪 Testing About Dialog (Test #130)');
  console.log('=' .repeat(60));

  let electronApp;
  let window;

  try {
    // Launch Electron app
    console.log('\n📱 Step 1: Connecting to running Electron app...');

    // For a running app, we'll use AppleScript to interact with it
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    // Check if app is running
    const { stdout } = await execAsync('osascript -e \'tell application "System Events" to tell process "Electron" to exists\'');
    if (stdout.trim() !== 'true') {
      throw new Error('Electron app is not running. Please start it with: npm run dev');
    }
    console.log('✅ App is running');

    // Use Playwright to launch and connect
    console.log('\n📱 Step 2: Launching Playwright Electron instance...');
    electronApp = await electron.launch({
      args: [path.join(__dirname, 'dist/main/main.js')],
      env: {
        ...process.env,
        NODE_ENV: 'development'
      }
    });

    window = await electronApp.firstWindow();
    console.log('✅ Connected to app window');

    // Wait for app to load
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    console.log('\n⚙️  Step 3: Navigate to Settings view...');

    // Click on Settings in sidebar
    const settingsButton = await window.locator('button.nav-item').filter({ hasText: 'Settings' });
    await settingsButton.click();
    await window.waitForTimeout(500);
    console.log('✅ Navigated to Settings');

    console.log('\n📋 Step 4: Scroll to About section...');

    // Scroll down to the About section
    await window.evaluate(() => {
      const settingsContent = document.querySelector('.settings-content');
      if (settingsContent) {
        settingsContent.scrollTop = settingsContent.scrollHeight;
      }
    });
    await window.waitForTimeout(500);
    console.log('✅ Scrolled to bottom of Settings');

    console.log('\n🔘 Step 5: Click About button...');

    // Find and click the About button
    const aboutButton = await window.locator('button.secondary-button').filter({ hasText: 'About' });
    await aboutButton.click();
    await window.waitForTimeout(1000);
    console.log('✅ Clicked About button');

    console.log('\n✅ Step 6: Verify About dialog is displayed...');

    // Check if the modal overlay exists
    const modalOverlay = await window.locator('.modal-overlay');
    const isVisible = await modalOverlay.isVisible();

    if (!isVisible) {
      throw new Error('About dialog modal overlay is not visible');
    }
    console.log('✅ About dialog modal is visible');

    console.log('\n📋 Step 7: Verify dialog content...');

    // Check for app name
    const appName = await window.locator('.app-name').textContent();
    if (!appName || !appName.includes('Ricekit')) {
      throw new Error(`App name not found or incorrect: ${appName}`);
    }
    console.log(`✅ App name displayed: ${appName}`);

    // Check for version
    const appVersion = await window.locator('.app-version').textContent();
    if (!appVersion || !appVersion.includes('Version')) {
      throw new Error(`Version not found or incorrect: ${appVersion}`);
    }
    console.log(`✅ Version displayed: ${appVersion}`);

    // Check for description
    const appDescription = await window.locator('.app-description').textContent();
    if (!appDescription || appDescription.length < 10) {
      throw new Error(`Description not found or too short: ${appDescription}`);
    }
    console.log(`✅ Description displayed: ${appDescription.substring(0, 50)}...`);

    // Check for Credits section
    const creditsSection = await window.locator('.detail-section h4').filter({ hasText: 'Credits' });
    const creditsVisible = await creditsSection.isVisible();
    if (!creditsVisible) {
      throw new Error('Credits section not found');
    }
    console.log('✅ Credits section displayed');

    // Check for Links section
    const linksSection = await window.locator('.detail-section h4').filter({ hasText: 'Links' });
    const linksVisible = await linksSection.isVisible();
    if (!linksVisible) {
      throw new Error('Links section not found');
    }
    console.log('✅ Links section displayed');

    // Check for links
    const links = await window.locator('.about-link').count();
    if (links < 1) {
      throw new Error('No links found in About dialog');
    }
    console.log(`✅ Found ${links} links in About dialog`);

    console.log('\n📸 Step 8: Take screenshot of About dialog...');
    const screenshotPath = path.join(__dirname, 'screenshots', `about-dialog-${Date.now()}.png`);
    await window.screenshot({ path: screenshotPath });
    console.log(`✅ Screenshot saved: ${screenshotPath}`);

    console.log('\n🔘 Step 9: Close About dialog...');

    // Click the Close button
    const closeButton = await window.locator('.modal-actions button.primary-button');
    await closeButton.click();
    await window.waitForTimeout(500);

    // Verify modal is closed
    const modalStillVisible = await modalOverlay.isVisible().catch(() => false);
    if (modalStillVisible) {
      throw new Error('About dialog did not close');
    }
    console.log('✅ About dialog closed successfully');

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED - About Dialog Test #130');
    console.log('='.repeat(60));
    console.log('\n✨ About dialog displays all required information:');
    console.log('   • Application name (Ricekit)');
    console.log('   • Version number');
    console.log('   • Application description');
    console.log('   • Credits section');
    console.log('   • Links section with clickable links');
    console.log('   • Close functionality working');
    console.log('\n✅ Test #130: About dialog displays application info - PASSED');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  } finally {
    if (electronApp) {
      await electronApp.close().catch(() => {});
    }
  }
}

runTest();
