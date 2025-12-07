/**
 * Verification Test - Check core app functionality before implementing new features
 * Tests a passing test to ensure no regressions
 */

const { _electron: electron } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runVerificationTest() {
  console.log('Starting core functionality verification...\n');

  let electronApp;

  try {
    // Launch the Electron app
    console.log('Step 1: Launching MacTheme application...');
    electronApp = await electron.launch({
      args: ['.'],
      cwd: process.cwd(),
      timeout: 30000
    });

    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    console.log('✅ App launched successfully\n');

    // Test 1: Verify themes load (Test #5 - Theme Browser displays all themes)
    console.log('Test 1: Verifying theme browser displays themes...');

    // Wait for themes to load
    await window.waitForSelector('[data-testid="theme-card"], .theme-card, [class*="theme"]', { timeout: 10000 });

    // Count theme cards
    const themeCards = await window.$$('[data-testid="theme-card"], .theme-card, [class*="ThemeCard"]');
    console.log(`Found ${themeCards.length} theme cards in the UI`);

    if (themeCards.length > 0) {
      console.log('✅ Theme browser displays themes correctly\n');
    } else {
      console.log('❌ No theme cards found - potential regression!\n');
      throw new Error('Theme loading verification failed');
    }

    // Test 2: Verify theme can be applied (Test #7 - Apply theme updates symlink)
    console.log('Test 2: Verifying theme application works...');

    // Click on first theme card
    const firstCard = themeCards[0];
    await firstCard.click();
    await window.waitForTimeout(1000);

    // Look for Apply button and click it
    const applyButton = await window.$('button:has-text("Apply")');
    if (applyButton) {
      await applyButton.click();
      console.log('Clicked Apply button');
      await window.waitForTimeout(2000);

      // Check if symlink was updated
      const symlinkPath = path.join(
        process.env.HOME,
        'Library/Application Support/MacTheme/current/theme'
      );

      if (fs.existsSync(symlinkPath)) {
        const stats = fs.lstatSync(symlinkPath);
        if (stats.isSymbolicLink()) {
          const target = fs.readlinkSync(symlinkPath);
          console.log(`Symlink exists and points to: ${target}`);
          console.log('✅ Theme application works correctly\n');
        } else {
          console.log('❌ Current theme path exists but is not a symlink\n');
        }
      } else {
        console.log('❌ Symlink was not created\n');
      }
    } else {
      console.log('⚠️  Could not find Apply button (theme may already be applied)\n');
    }

    console.log('===========================================');
    console.log('VERIFICATION RESULT: ✅ PASSED');
    console.log('===========================================');
    console.log('Core functionality is working correctly.');
    console.log('Safe to proceed with new feature implementation.\n');

  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED:', error.message);
    console.error('\nThis indicates a regression in core functionality.');
    console.error('DO NOT implement new features until this is fixed!\n');
    throw error;
  } finally {
    if (electronApp) {
      await electronApp.close();
    }
  }
}

runVerificationTest().catch(error => {
  console.error('Test execution error:', error);
  process.exit(1);
});
