const { _electron: electron } = require('playwright');

(async () => {
  try {
    console.log('Connecting to running Electron app...');
    const electronApp = await electron.connect('http://localhost:9223');

    console.log('Getting first window...');
    const window = await electronApp.firstWindow();

    console.log('Taking screenshot...');
    await window.screenshot({ path: 'verification-screenshot.png' });

    console.log('✅ Successfully connected and took screenshot');
    console.log('Window title:', await window.title());

    // Check if themes are displayed
    const themesCount = await window.locator('.theme-card').count();
    console.log('Theme cards visible:', themesCount);

    await electronApp.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
