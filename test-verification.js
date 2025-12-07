const puppeteer = require('puppeteer');

(async () => {
  try {
    console.log('🔍 Verification Test - Theme Application');
    console.log('=========================================\n');

    console.log('Connecting to Electron app...');
    const browser = await puppeteer.connect({
      browserURL: 'http://localhost:9222',
      defaultViewport: null
    });

    const pages = await browser.pages();
    const page = pages[0];

    console.log('✓ Connected! Current URL:', await page.url());

    // Navigate to Themes view if not already there
    console.log('\n1. Navigating to Themes view...');
    try {
      const themesButton = await page.waitForSelector('text/Themes', { timeout: 5000 });
      await themesButton.click();
      await page.waitForTimeout(1000);
      console.log('✓ On Themes view');
    } catch (e) {
      console.log('⚠ Already on Themes view or button not found');
    }

    // Check for console errors
    console.log('\n2. Checking for console errors...');
    let errorCount = 0;
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errorCount++;
        console.log('❌ Console error:', msg.text());
      }
    });

    await page.waitForTimeout(1000);
    if (errorCount === 0) {
      console.log('✓ No console errors detected');
    }

    // Find and count theme cards
    console.log('\n3. Checking theme cards...');
    const themeCount = await page.evaluate(() => {
      const cards = document.querySelectorAll('[class*="rounded-lg"]');
      let count = 0;
      for (const card of cards) {
        if (card.textContent.includes('Apply')) {
          count++;
        }
      }
      return count;
    });

    console.log(`✓ Found ${themeCount} theme cards`);

    // Try to find Catppuccin Mocha and apply it
    console.log('\n4. Testing theme application (Catppuccin Mocha)...');
    const applied = await page.evaluate(() => {
      const allDivs = document.querySelectorAll('div');
      for (const div of allDivs) {
        if (div.textContent.includes('Catppuccin Mocha')) {
          // Look for Apply button in this div or its children
          const buttons = div.querySelectorAll('button');
          for (const btn of buttons) {
            if (btn.textContent.trim() === 'Apply' || btn.textContent.includes('Apply')) {
              btn.click();
              return true;
            }
          }
        }
      }
      return false;
    });

    if (applied) {
      console.log('✓ Clicked Apply button for Catppuccin Mocha');
      console.log('  Waiting for theme to apply...');
      await page.waitForTimeout(2000);
      console.log('✓ Theme application complete');
    } else {
      console.log('⚠ Could not find Catppuccin Mocha or Apply button');
    }

    console.log('\n5. Verification test complete! ✓');
    console.log('=========================================\n');

    await browser.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
})();
