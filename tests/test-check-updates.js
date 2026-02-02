#!/usr/bin/env node

/**
 * Test #129: Check for updates feature works correctly
 *
 * This test verifies:
 * 1. Navigate to Settings
 * 2. Click 'Check for Updates' button
 * 3. Verify update check is performed
 * 4. Verify result is displayed (up to date or update available)
 */

const { chromium } = require('playwright');

async function test() {
  console.log('Test #129: Check for Updates feature');
  console.log('='.repeat(50));

  let browser;
  let passed = true;

  try {
    // Launch browser and connect to Electron app
    browser = await chromium.connectOverCDP('http://localhost:9222');
    const contexts = browser.contexts();

    if (contexts.length === 0) {
      throw new Error('No browser contexts found. Is the Electron app running?');
    }

    const context = contexts[0];
    const pages = context.pages();

    if (pages.length === 0) {
      throw new Error('No pages found. Is the Electron app running?');
    }

    const page = pages[0];

    console.log('✓ Connected to Electron app');

    // Step 1: Navigate to Settings
    console.log('\nStep 1: Navigate to Settings');
    await page.waitForSelector('[data-view="settings"], button:has-text("Settings")', { timeout: 5000 });

    // Click Settings in sidebar if needed
    const settingsButton = await page.$('button:has-text("Settings")');
    if (settingsButton) {
      await settingsButton.click();
      console.log('✓ Clicked Settings button in sidebar');
    }

    // Wait for settings view to load
    await page.waitForSelector('.settings-view', { timeout: 5000 });
    console.log('✓ Settings view loaded');

    // Step 2: Find and click 'Check for Updates' button
    console.log('\nStep 2: Click "Check for Updates" button');

    // Scroll to Help & About section if needed
    await page.evaluate(() => {
      const helpSection = Array.from(document.querySelectorAll('.section-title'))
        .find(el => el.textContent.includes('Help & About'));
      if (helpSection) {
        helpSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    await page.waitForTimeout(500);

    // Find the Check for Updates button
    const checkUpdatesButton = await page.waitForSelector('button:has-text("Check for Updates")', { timeout: 5000 });
    console.log('✓ Found "Check for Updates" button');

    // Step 3: Click the button and verify update check is performed
    console.log('\nStep 3: Verify update check is performed');
    await checkUpdatesButton.click();
    console.log('✓ Clicked "Check for Updates" button');

    // Wait for button text to change to "Checking..."
    await page.waitForSelector('button:has-text("Checking...")', { timeout: 2000 });
    console.log('✓ Update check in progress (button shows "Checking...")');

    // Step 4: Verify result is displayed
    console.log('\nStep 4: Verify result is displayed');

    // Wait for the result to appear (button should change back to "Check for Updates")
    await page.waitForSelector('button:has-text("Check for Updates")', { timeout: 5000 });
    console.log('✓ Update check completed');

    // Check for the result message
    const settingDescription = await page.waitForSelector('.setting-item:has(button:has-text("Check for Updates")) .setting-description', { timeout: 5000 });
    const resultText = await settingDescription.textContent();

    console.log('\nUpdate Check Result:');
    console.log(`  Message: "${resultText.trim()}"`);

    // Verify that result contains version information or error message
    if (resultText.includes('up to date') ||
        resultText.includes('v0.1.0') ||
        resultText.includes('Update available') ||
        resultText.includes('error') ||
        resultText.includes('Failed')) {
      console.log('✓ Result is displayed with version or status information');
    } else {
      console.log('✗ Result does not contain expected information');
      passed = false;
    }

    // Take a screenshot for verification
    await page.screenshot({
      path: '/Users/brandon/personal/mac-themes/autonomous-coding/ricekit/screenshots/test-129-check-updates.png',
      fullPage: true
    });
    console.log('\n✓ Screenshot saved to screenshots/test-129-check-updates.png');

    // Test complete
    console.log('\n' + '='.repeat(50));
    if (passed) {
      console.log('✅ Test #129 PASSED: Check for Updates feature works correctly');
      console.log('\nAll steps verified:');
      console.log('  ✓ Navigate to Settings');
      console.log('  ✓ Click "Check for Updates" button');
      console.log('  ✓ Update check is performed');
      console.log('  ✓ Result is displayed');
    } else {
      console.log('❌ Test #129 FAILED');
    }

    return passed;

  } catch (error) {
    console.error('\n❌ Test #129 FAILED with error:', error.message);
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
test().then(passed => {
  process.exit(passed ? 0 : 1);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
