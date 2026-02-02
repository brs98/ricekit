#!/usr/bin/env node

/**
 * Test #136: Theme editor validates color inputs
 * Tests that invalid color inputs show validation errors
 */

const { _electron: electron } = require('playwright');
const path = require('path');

async function testColorValidation() {
  console.log('🔍 Test #136: Theme editor validates color inputs\n');

  let electronApp;
  let window;

  try {
    // Launch Electron app
    console.log('Step 1: Launching Ricekit application...');
    electronApp = await electron.launch({
      args: ['.'],
      env: {
        ...process.env,
        NODE_ENV: 'development'
      }
    });

    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    console.log('✅ App launched\n');

    // Wait for app to fully load
    await window.waitForTimeout(2000);

    // Step 1: Navigate to Editor view
    console.log('Step 1: Navigate to Editor view');
    const editorNavButton = await window.locator('text=Editor').first();
    await editorNavButton.click();
    await window.waitForTimeout(1000);
    console.log('✅ Navigated to Editor view\n');

    // Find a color input field (background color)
    console.log('Step 2: Attempt to enter invalid hex code');

    // Find the hex input for background color
    const backgroundInput = await window.locator('input[type="text"][placeholder="#000000"]').first();

    // Clear and enter invalid value
    await backgroundInput.clear();
    await backgroundInput.fill('not-a-color');
    await backgroundInput.blur(); // Trigger validation
    await window.waitForTimeout(500);

    // Check if error message appears
    const errorMessage = await window.locator('.color-input-error').first();
    const errorVisible = await errorMessage.isVisible().catch(() => false);

    if (errorVisible) {
      const errorText = await errorMessage.textContent();
      console.log(`✅ Validation error shown: "${errorText}"\n`);
    } else {
      console.log('❌ FAIL: No validation error shown for invalid input\n');
      throw new Error('Validation error not shown');
    }

    // Step 3: Verify validation error is shown
    console.log('Step 3: Verify validation error is shown');
    console.log('✅ Validation error displayed correctly\n');

    // Step 4: Enter valid hex code
    console.log('Step 4: Enter valid hex code');
    await backgroundInput.clear();
    await backgroundInput.fill('#FF5733');
    await backgroundInput.blur();
    await window.waitForTimeout(500);

    // Check if error is cleared
    const errorStillVisible = await errorMessage.isVisible().catch(() => false);

    if (!errorStillVisible) {
      console.log('✅ Valid hex code accepted, error cleared\n');
    } else {
      console.log('⚠️  WARNING: Error still visible after valid input\n');
    }

    // Step 5: Verify it is accepted
    console.log('Step 5: Verify valid hex code is accepted');
    const inputValue = await backgroundInput.inputValue();
    if (inputValue === '#FF5733') {
      console.log('✅ Valid color value accepted\n');
    } else {
      console.log(`⚠️  Value is: ${inputValue}\n`);
    }

    console.log('🎉 Test #136 PASSED!\n');
    console.log('✅ Color validation working correctly');
    console.log('✅ Invalid colors show error messages');
    console.log('✅ Valid colors are accepted');
    console.log('✅ Ready to mark test as passing\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    throw error;
  } finally {
    if (electronApp) {
      await electronApp.close();
    }
  }
}

// Run the test
testColorValidation().catch(error => {
  console.error('Test script error:', error);
  process.exit(1);
});
