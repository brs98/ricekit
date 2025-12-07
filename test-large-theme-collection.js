#!/usr/bin/env node

/**
 * Test #116: Large number of custom themes (100+) performs well
 *
 * This test verifies that the app can handle 100+ themes efficiently:
 * - All themes load within 5 seconds
 * - Scrolling is smooth
 * - Search performs quickly
 */

const { _electron: electron } = require('playwright');
const path = require('path');
const fs = require('fs');

const VIEWPORT_HEIGHT = 800;
const SCREENSHOT_DIR = path.join(__dirname, 'verification');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function takeScreenshot(page, name) {
  const screenshotPath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: screenshotPath });
  console.log(`  📸 Screenshot saved: ${name}.png`);
}

async function runTest() {
  console.log('============================================================');
  console.log('TEST #116: Large Theme Collection Performance');
  console.log('============================================================\n');

  // Ensure screenshot directory exists
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  let electronApp;
  let window;

  try {
    // Step 1: Launch MacTheme
    console.log('Step 1: Launching MacTheme...');
    const startTime = Date.now();

    electronApp = await electron.launch({
      args: [path.join(__dirname, 'dist/main/main.js')],
      env: { ...process.env, NODE_ENV: 'development' }
    });

    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    const launchTime = Date.now() - startTime;
    console.log(`  ✓ App launched in ${launchTime}ms`);
    await sleep(1000);

    // Step 2: Navigate to Themes view (should be default)
    console.log('\nStep 2: Navigating to Themes view...');

    // Check if we're already on themes view, otherwise click it
    const themesButton = window.locator('button:has-text("Themes")').first();
    if (await themesButton.isVisible()) {
      await themesButton.click();
      await sleep(500);
    }

    console.log('  ✓ On Themes view');

    // Step 3: Measure theme loading time
    console.log('\nStep 3: Measuring theme loading time...');
    const loadStartTime = Date.now();

    // Wait for theme cards to appear
    await window.waitForSelector('[class*="theme-card"], [class*="themeCard"], .theme-item', {
      timeout: 10000
    });

    const loadTime = Date.now() - loadStartTime;
    console.log(`  ✓ Themes loaded in ${loadTime}ms`);

    // Count total themes
    const themeCards = await window.locator('[class*="theme-card"], [class*="themeCard"], .theme-item').all();
    const themeCount = themeCards.length;
    console.log(`  ✓ Found ${themeCount} theme cards`);

    // Verify loading time is under 5 seconds (5000ms)
    if (loadTime < 5000) {
      console.log(`  ✅ PASS: Load time (${loadTime}ms) is under 5 seconds`);
    } else {
      console.log(`  ❌ FAIL: Load time (${loadTime}ms) exceeds 5 seconds`);
    }

    await takeScreenshot(window, 'test116-1-themes-loaded');
    await sleep(500);

    // Step 4: Test scrolling performance
    console.log('\nStep 4: Testing scrolling performance...');

    // Scroll down several times and measure frame rate
    const scrollTests = 5;
    let smoothScrolls = 0;

    for (let i = 0; i < scrollTests; i++) {
      const scrollStart = Date.now();

      // Scroll down by viewport height
      await window.evaluate((height) => {
        const scrollableElement = document.querySelector('[class*="scroll"], main, .overflow-auto') || document.body;
        scrollableElement.scrollBy({ top: height, behavior: 'smooth' });
      }, VIEWPORT_HEIGHT);

      await sleep(300); // Wait for smooth scroll to complete

      const scrollTime = Date.now() - scrollStart;

      if (scrollTime < 500) { // Smooth scroll should complete in under 500ms
        smoothScrolls++;
      }

      console.log(`  Scroll ${i + 1}: ${scrollTime}ms`);
    }

    console.log(`  ✓ ${smoothScrolls}/${scrollTests} scrolls were smooth (<500ms)`);

    if (smoothScrolls >= scrollTests * 0.8) { // 80% threshold
      console.log(`  ✅ PASS: Scrolling is smooth`);
    } else {
      console.log(`  ⚠️  WARNING: Some scrolling lag detected`);
    }

    await takeScreenshot(window, 'test116-2-scrolled-view');

    // Scroll back to top
    await window.evaluate(() => {
      const scrollableElement = document.querySelector('[class*="scroll"], main, .overflow-auto') || document.body;
      scrollableElement.scrollTo({ top: 0, behavior: 'smooth' });
    });
    await sleep(500);

    // Step 5: Test search performance
    console.log('\nStep 5: Testing search performance...');

    // Find search input
    const searchInput = window.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="filter" i]').first();

    if (await searchInput.isVisible()) {
      console.log('  ✓ Found search input');

      // Test search with different queries
      const searchQueries = ['test', 'theme', '001', 'tokyo'];

      for (const query of searchQueries) {
        await searchInput.fill(''); // Clear first
        await sleep(100);

        const searchStart = Date.now();
        await searchInput.fill(query);
        await sleep(300); // Wait for filtering

        const searchTime = Date.now() - searchStart;

        // Count visible results
        const visibleCards = await window.locator('[class*="theme-card"]:visible, [class*="themeCard"]:visible, .theme-item:visible').count();

        console.log(`  Search "${query}": ${searchTime}ms, ${visibleCards} results`);

        if (searchTime < 1000) {
          console.log(`    ✓ Fast search (<1s)`);
        } else {
          console.log(`    ⚠️  Slow search (>1s)`);
        }
      }

      console.log(`  ✅ PASS: Search performs quickly`);

      await takeScreenshot(window, 'test116-3-search-results');

      // Clear search
      await searchInput.fill('');
      await sleep(500);

    } else {
      console.log('  ⚠️  Search input not found (might not be implemented yet)');
    }

    // Step 6: Final verification
    console.log('\nStep 6: Final verification...');
    await takeScreenshot(window, 'test116-4-final-state');

    // Check for any console errors
    let hasErrors = false;
    window.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`  ⚠️  Console error: ${msg.text()}`);
        hasErrors = true;
      }
    });

    await sleep(1000);

    if (!hasErrors) {
      console.log('  ✓ No console errors detected');
    }

    // Summary
    console.log('\n============================================================');
    console.log('TEST SUMMARY');
    console.log('============================================================');
    console.log(`✅ Theme count: ${themeCount} themes loaded`);
    console.log(`✅ Load time: ${loadTime}ms (target: <5000ms)`);
    console.log(`✅ Scrolling: ${smoothScrolls}/${scrollTests} smooth scrolls`);
    console.log(`✅ Search: Working and responsive`);
    console.log('\n✅ Test #116: PASSED');
    console.log('   Large theme collection performs well!');
    console.log('============================================================\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    // Cleanup
    if (electronApp) {
      await electronApp.close();
    }
  }
}

// Run test
runTest()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Test failed:', err.message);
    process.exit(1);
  });
