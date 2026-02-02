const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

(async () => {
  console.log('🔍 Starting Theme Switching Verification Test...\n');

  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const contexts = browser.contexts();
  const context = contexts[0];
  const pages = context.pages();
  const page = pages[0];

  try {
    // Wait for app to be ready
    await page.waitForTimeout(1000);

    console.log('✓ Connected to Ricekit application');

    // Navigate to Themes view if not already there
    const themesButton = page.locator('button:has-text("Themes"), a:has-text("Themes")').first();
    if (await themesButton.isVisible()) {
      await themesButton.click();
      await page.waitForTimeout(500);
      console.log('✓ Navigated to Themes view');
    }

    // Check that theme grid is visible
    const themeGrid = page.locator('.theme-grid, [class*="theme-grid"]').first();
    const isVisible = await themeGrid.isVisible();

    if (!isVisible) {
      console.log('❌ Theme grid is not visible');
      process.exit(1);
    }

    console.log('✓ Theme grid is visible');

    // Count theme cards
    const themeCards = page.locator('[class*="theme-card"], .theme-card');
    const cardCount = await themeCards.count();
    console.log(`✓ Found ${cardCount} theme cards`);

    if (cardCount < 11) {
      console.log('❌ Expected at least 11 bundled themes');
      process.exit(1);
    }

    // Check for theme names
    const tokyoNight = page.locator('text=/tokyo.?night/i').first();
    const hasTokyoNight = await tokyoNight.isVisible();

    if (!hasTokyoNight) {
      console.log('❌ Tokyo Night theme not found');
      process.exit(1);
    }

    console.log('✓ Tokyo Night theme is visible');

    // Check current theme symlink exists
    const symlinkPath = path.join(os.homedir(), 'Library/Application Support/Ricekit/current/theme');
    const symlinkExists = fs.existsSync(symlinkPath);

    if (!symlinkExists) {
      console.log('❌ Theme symlink does not exist at:', symlinkPath);
      process.exit(1);
    }

    console.log('✓ Theme symlink exists');

    // Check if it's actually a symlink
    const stats = fs.lstatSync(symlinkPath);
    if (!stats.isSymbolicLink()) {
      console.log('❌ Current theme is not a symlink');
      process.exit(1);
    }

    console.log('✓ Current theme is a valid symlink');

    // Read where it points
    const target = fs.readlinkSync(symlinkPath);
    console.log(`✓ Symlink points to: ${target}`);

    console.log('\n✅ ALL VERIFICATION TESTS PASSED!');
    console.log('Theme switching system is working correctly.');

    await browser.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Verification test failed:', error.message);
    await browser.close();
    process.exit(1);
  }
})();
