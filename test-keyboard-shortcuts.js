const puppeteer = require('puppeteer-core');

(async () => {
  try {
    const browser = await puppeteer.connect({
      browserURL: 'http://localhost:9222',
      defaultViewport: null
    });

    const pages = await browser.pages();
    const page = pages[0] || (await browser.newPage());

    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2', timeout: 10000 });

    console.log('✓ Connected to MacTheme app');

    // Wait for the app to load
    await page.waitForSelector('.sidebar', { timeout: 5000 });

    // Click on Settings in the sidebar
    await page.evaluate(() => {
      const settingsLink = Array.from(document.querySelectorAll('.nav-item')).find(
        el => el.textContent.includes('Settings')
      );
      if (settingsLink) settingsLink.click();
    });

    console.log('✓ Clicked Settings navigation');

    // Wait for settings view to load
    await page.waitForSelector('.settings-view', { timeout: 5000 });
    await page.waitForTimeout(1000);

    // Find the keyboard shortcut input
    const shortcutValue = await page.evaluate(() => {
      const shortcutInput = document.querySelector('.shortcut-input');
      return shortcutInput ? shortcutInput.value : null;
    });

    console.log('\n📋 Keyboard Shortcut Display Test:');
    console.log('   Current value:', JSON.stringify(shortcutValue));

    // Check if it contains macOS symbols
    const hasCommandSymbol = shortcutValue && shortcutValue.includes('⌘');
    const hasShiftSymbol = shortcutValue && shortcutValue.includes('⇧');

    console.log('\n   Symbol Checks:');
    console.log('   ⌘ (Command) symbol present:', hasCommandSymbol ? '✅' : '❌');
    console.log('   ⇧ (Shift) symbol present:', hasShiftSymbol ? '✅' : '❌');

    // Also check the placeholder if value is empty
    if (!shortcutValue) {
      const placeholder = await page.evaluate(() => {
        const shortcutInput = document.querySelector('.shortcut-input');
        return shortcutInput ? shortcutInput.placeholder : null;
      });
      console.log('   Placeholder:', JSON.stringify(placeholder));

      const placeholderHasSymbols = placeholder && (placeholder.includes('⌘') || placeholder.includes('⇧'));
      console.log('   Placeholder has symbols:', placeholderHasSymbols ? '✅' : '❌');
    }

    console.log('\n' + '='.repeat(60));
    if (hasCommandSymbol && hasShiftSymbol) {
      console.log('✅ SUCCESS: Keyboard shortcuts are displayed with macOS symbols!');
    } else if (!shortcutValue) {
      console.log('⚠️  No shortcut value set yet. Check placeholder or set a shortcut.');
    } else {
      console.log('❌ FAIL: Keyboard shortcuts are not using macOS symbols');
    }
    console.log('='.repeat(60) + '\n');

    await browser.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
