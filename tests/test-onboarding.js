/**
 * Test onboarding flow
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function testOnboarding() {
  console.log('='.repeat(60));
  console.log('TEST: Onboarding Flow');
  console.log('='.repeat(60));
  console.log('');

  let browser;
  try {
    // Connect to the running Electron app
    const electronPath = path.join(__dirname, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron');

    // Get the debug port from running process
    const { execSync } = require('child_process');
    const debugPort = 9222;

    // Wait a moment for the app to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));

    browser = await puppeteer.connect({
      browserURL: `http://localhost:${debugPort}`,
      defaultViewport: null,
    });

    const pages = await browser.pages();
    const page = pages[0];

    console.log('✓ Connected to Electron app');
    console.log('');

    // Take initial screenshot
    await page.screenshot({ path: 'screenshots/onboarding-initial.png' });
    console.log('✓ Screenshot saved: onboarding-initial.png');

    // Check if onboarding modal is visible
    const modalExists = await page.evaluate(() => {
      const modal = document.querySelector('.fixed.inset-0');
      return modal !== null;
    });

    console.log('');
    console.log('Onboarding Modal Check:');
    console.log(`  Modal visible: ${modalExists ? '✓ YES' : '✗ NO'}`);

    if (modalExists) {
      // Read the modal content
      const modalContent = await page.evaluate(() => {
        const heading = document.querySelector('h2');
        const buttons = Array.from(document.querySelectorAll('button'));
        return {
          heading: heading ? heading.textContent : 'No heading found',
          buttonCount: buttons.length,
          buttonTexts: buttons.map(b => b.textContent.trim()).filter(t => t),
        };
      });

      console.log(`  Heading: "${modalContent.heading}"`);
      console.log(`  Buttons: ${modalContent.buttonTexts.join(', ')}`);
      console.log('');
      console.log('✅ TEST PASSED: Onboarding modal is displayed');
    } else {
      console.log('');
      console.log('❌ TEST FAILED: Onboarding modal is NOT displayed');
    }

    console.log('');
    console.log('='.repeat(60));

    await browser.disconnect();
    process.exit(modalExists ? 0 : 1);

  } catch (error) {
    console.error('Error during test:', error.message);
    if (browser) {
      await browser.disconnect();
    }
    process.exit(1);
  }
}

testOnboarding();
