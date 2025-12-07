#!/usr/bin/env node
const { _electron: electron } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('🧪 Test #153: Favorite themes listed at top of quick switcher\n');
  console.log('==================================================\n');

  let electronApp;
  try {
    // Step 1: Mark tokyo-night and nord as favorites
    console.log('Step 1: Mark tokyo-night and nord as favorites');
    const prefsPath = path.join(
      process.env.HOME,
      'Library/Application Support/MacTheme/preferences.json'
    );
    const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
    prefs.favorites = ['Tokyo Night', 'Nord'];
    fs.writeFileSync(prefsPath, JSON.stringify(prefs, null, 2));
    console.log('  ✓ Favorites set: Tokyo Night, Nord\n');

    // Wait a moment for file to be saved
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 2: Launch fresh Electron instance
    console.log('Step 2: Launch Electron app');
    electronApp = await electron.launch({
      args: [path.join(__dirname, 'dist/main/main.js')],
      env: {
        ...process.env,
        NODE_ENV: 'development'
      }
    });

    const page = await electronApp.firstWindow();

    // Wait for app to load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    console.log('  ✓ App loaded\n');

    console.log('Step 3: Open quick switcher via keyboard shortcut');
    // Trigger quick switcher with keyboard shortcut
    // On macOS, Cmd+Shift+T
    await page.keyboard.press('Meta+Shift+T');

    // Wait for the quick switcher window to open
    await page.waitForTimeout(1000);
    const windows = electronApp.windows();
    console.log(`  Found ${windows.length} windows`);

    // The quick switcher should be the second window
    let quickSwitcherPage;
    if (windows.length > 1) {
      quickSwitcherPage = windows[1];
    } else {
      throw new Error('Quick switcher window did not open');
    }

    // Wait for quick switcher to load
    await quickSwitcherPage.waitForLoadState('domcontentloaded');
    await quickSwitcherPage.waitForTimeout(1500);

    // Try to find the quick switcher element
    const hasSwitcher = await quickSwitcherPage.locator('.quick-switcher').count();
    console.log(`  Quick switcher elements found: ${hasSwitcher}`);

    if (hasSwitcher === 0) {
      // Take a screenshot to debug
      await quickSwitcherPage.screenshot({ path: 'debug-quick-switcher.png' });
      const url = quickSwitcherPage.url();
      console.log(`  Quick switcher URL: ${url}`);
      throw new Error('Quick switcher UI not found in window');
    }

    console.log('  ✓ Quick switcher opened\n');

    // Use the quick switcher page for the rest of the test
    const qsPage = quickSwitcherPage;

    // Step 4: Verify favorites section appears at top
    console.log('Step 4: Verify favorites section appears at top');
    const favoritesHeader = await qsPage.locator('.quick-switcher-section-header').first();
    const isVisible = await favoritesHeader.isVisible();
    if (!isVisible) {
      throw new Error('Favorites section header not visible');
    }
    const headerText = await favoritesHeader.textContent();
    if (headerText !== 'Favorites') {
      throw new Error(`Expected header "Favorites", got "${headerText}"`);
    }
    console.log('  ✓ Favorites section header found: "' + headerText + '"\n');

    // Step 5: Verify tokyo-night and nord are listed in favorites
    console.log('Step 5: Verify tokyo-night and nord are listed in favorites');

    // Get all theme items in the favorites section
    // (items between "Favorites" header and "All Themes" header)
    const allHeaders = await qsPage.locator('.quick-switcher-section-header').all();
    const allItems = await qsPage.locator('.quick-switcher-item').all();

    // Find favorite items (those before "All Themes" header if it exists)
    let favoriteItems = [];
    for (const item of allItems) {
      const name = await item.locator('.quick-switcher-item-name').textContent();
      // Check if this item has a star (favorites have stars)
      if (name.includes('★')) {
        favoriteItems.push(name);
      }
    }

    console.log('  Found favorite items:', favoriteItems);

    const hasTokyoNight = favoriteItems.some(name => name.includes('Tokyo Night'));
    const hasNord = favoriteItems.some(name => name.includes('Nord'));

    if (!hasTokyoNight) {
      throw new Error('Tokyo Night not found in favorites');
    }
    if (!hasNord) {
      throw new Error('Nord not found in favorites');
    }
    console.log('  ✓ Tokyo Night found in favorites');
    console.log('  ✓ Nord found in favorites\n');

    // Step 6: Verify they appear before other themes
    console.log('Step 6: Verify favorites appear before other themes');
    const allThemeNames = [];
    for (const item of allItems) {
      const name = await item.locator('.quick-switcher-item-name').textContent();
      // Clean up the name (remove star, "(current)", etc.)
      const cleanName = name.replace('★', '').replace('(current)', '').trim();
      allThemeNames.push(cleanName);
    }

    console.log('  Theme order:', allThemeNames.slice(0, 5).join(', '), '...');

    const tokyoIndex = allThemeNames.findIndex(n => n.includes('Tokyo Night'));
    const nordIndex = allThemeNames.findIndex(n => n.includes('Nord'));
    const firstNonFavorite = allThemeNames.findIndex(n =>
      !n.includes('Tokyo Night') && !n.includes('Nord')
    );

    if (tokyoIndex > firstNonFavorite || nordIndex > firstNonFavorite) {
      throw new Error('Favorites not appearing before other themes');
    }
    console.log('  ✓ Favorites appear before other themes\n');

    // Take screenshot for documentation
    await qsPage.screenshot({ path: 'test-quick-switcher-favorites.png' });
    console.log('  📸 Screenshot saved: test-quick-switcher-favorites.png\n');

    console.log('==================================================');
    console.log('✅ TEST #153 PASSED - All steps verified!');
    console.log('==================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (electronApp) {
      await electronApp.close();
    }
  }
})();
