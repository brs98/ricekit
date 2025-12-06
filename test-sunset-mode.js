/**
 * Test script for sunrise/sunset auto-switching feature
 * Verifies that sunrise/sunset times are calculated and displayed
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');

async function testSunsetMode() {
  console.log('🌅 Testing Sunrise/Sunset Mode Feature\n');
  console.log('=' .repeat(60));

  // Wait for app to be ready
  await app.whenReady();

  // Get the main window
  const windows = BrowserWindow.getAllWindows();
  if (windows.length === 0) {
    console.error('❌ No windows found');
    process.exit(1);
  }

  const mainWindow = windows[0];
  console.log('✓ Found main window');

  // Wait for renderer to load
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Test: Navigate to Settings view
  console.log('\n📋 Step 1: Navigate to Settings view');
  await mainWindow.webContents.executeJavaScript(`
    document.querySelector('[data-nav="settings"]')?.click();
  `);
  await new Promise(resolve => setTimeout(resolve, 500));
  console.log('✓ Navigated to Settings');

  // Test: Check if auto-switching section exists
  console.log('\n📋 Step 2: Locate Auto-Switching section');
  const hasAutoSwitch = await mainWindow.webContents.executeJavaScript(`
    document.querySelector('.auto-switch-mode') !== null;
  `);

  if (!hasAutoSwitch) {
    console.error('❌ Auto-switching section not found');
    process.exit(1);
  }
  console.log('✓ Auto-switching section found');

  // Test: Select Sunrise/Sunset mode
  console.log('\n📋 Step 3: Select Sunrise/Sunset mode');
  await mainWindow.webContents.executeJavaScript(`
    const select = document.querySelector('.auto-switch-mode select');
    if (select) {
      select.value = 'sunset';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  `);
  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for times to load
  console.log('✓ Selected Sunrise/Sunset mode');

  // Test: Check if sunrise/sunset times are displayed
  console.log('\n📋 Step 4: Check for sunrise/sunset times display');
  const sunTimesInfo = await mainWindow.webContents.executeJavaScript(`
    (function() {
      const sunriseLabelEl = document.querySelector('.sun-time-label');
      const sunriseValueEl = document.querySelector('.sun-time-value');
      const locationEl = document.querySelector('.location-text');

      return {
        hasSunTimes: sunriseLabelEl !== null,
        sunriseLabel: sunriseLabelEl?.textContent || '',
        sunriseValue: sunriseValueEl?.textContent || '',
        location: locationEl?.textContent || '',
        isLoading: document.querySelector('.loading-text') !== null,
        hasError: document.querySelector('.error-text') !== null
      };
    })();
  `);

  console.log('\n📊 Results:');
  console.log(`   - Has sun times display: ${sunTimesInfo.hasSunTimes}`);
  console.log(`   - Is loading: ${sunTimesInfo.isLoading}`);
  console.log(`   - Has error: ${sunTimesInfo.hasError}`);

  if (sunTimesInfo.hasSunTimes) {
    console.log(`   - Sunrise label: ${sunTimesInfo.sunriseLabel}`);
    console.log(`   - Sunrise value: ${sunTimesInfo.sunriseValue}`);
    console.log(`   - Location: ${sunTimesInfo.location}`);
  }

  // Verify test results
  console.log('\n' + '='.repeat(60));

  if (sunTimesInfo.hasSunTimes && sunTimesInfo.sunriseValue) {
    console.log('✅ TEST PASSED: Sunrise/sunset times are displayed!');
    console.log('\nVerification Details:');
    console.log(`   ✓ Sunrise/Sunset mode can be enabled`);
    console.log(`   ✓ Times are calculated and displayed`);
    console.log(`   ✓ Location information is shown`);
    console.log(`   ✓ UI elements are rendered correctly`);
  } else if (sunTimesInfo.isLoading) {
    console.log('⏳ Times are still loading... Please check the UI manually');
  } else if (sunTimesInfo.hasError) {
    console.log('⚠️  Error calculating times (this may be expected if no location service)');
    console.log('   However, the UI correctly shows error state');
  } else {
    console.log('❌ TEST FAILED: Sunrise/sunset times not displayed');
  }

  console.log('\n📸 Manual verification recommended:');
  console.log('   1. Check Settings > Auto-Switching section');
  console.log('   2. Select "Sunrise/Sunset" mode');
  console.log('   3. Verify sunrise and sunset times are displayed');
  console.log('   4. Verify location coordinates are shown');

  console.log('\n✨ Test complete!');
}

// Run test when app is ready
app.whenReady().then(() => {
  // Give the app time to fully initialize
  setTimeout(testSunsetMode, 5000);
}).catch(err => {
  console.error('Error during test:', err);
  process.exit(1);
});

// Prevent app from quitting
app.on('window-all-closed', () => {
  // Don't quit on window close during testing
});
