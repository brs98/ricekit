const puppeteer = require('puppeteer');

(async () => {
  try {
    console.log('Connecting to Electron app on port 9222...');
    const browser = await puppeteer.connect({
      browserURL: 'http://localhost:9222',
      defaultViewport: null
    });

    const pages = await browser.pages();
    const page = pages[0];

    console.log('Connected! Current URL:', await page.url());

    // Wait for app to load
    await page.waitForSelector('nav', { timeout: 5000 });
    console.log('✓ Sidebar navigation loaded');

    // Check sidebar items exist
    const themesNav = await page.$('text=Themes');
    console.log('✓ Themes nav item exists:', !!themesNav);

    const editorNav = await page.$('text=Editor');
    console.log('✓ Editor nav item exists:', !!editorNav);

    const appsNav = await page.$('text=Apps');
    console.log('✓ Apps nav item exists:', !!appsNav);

    const wallpapersNav = await page.$('text=Wallpapers');
    console.log('✓ Wallpapers nav item exists:', !!wallpapersNav);

    const settingsNav = await page.$('text=Settings');
    console.log('✓ Settings nav item exists:', !!settingsNav);

    console.log('\nAll navigation items present!');

    await browser.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
