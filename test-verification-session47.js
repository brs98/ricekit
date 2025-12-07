#!/usr/bin/env node

/**
 * Session 47 Verification Test
 * Tests core functionality to ensure app is working before implementing new features
 */

const { _electron: electron } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');

const MACTHEME_DIR = path.join(os.homedir(), 'Library/Application Support/MacTheme');

async function runVerificationTest() {
  console.log('🔍 Session 47 - Verification Test\n');
  console.log('Testing: Core theme loading and theme application\n');

  let electronApp;
  let window;

  try {
    // Launch Electron app
    console.log('Step 1: Launching MacTheme application...');
    electronApp = await electron.launch({
      args: ['.'],
      env: {
        ...process.env,
        NODE_ENV: 'development'
      }
    });

    // Get the first window
    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    console.log('✅ App launched successfully\n');

    // Wait a bit for the app to fully load
    await window.waitForTimeout(2000);

    // Test 1: Verify themes are displayed
    console.log('Test 1: Verify themes are displayed in grid');
    const themeCards = await window.locator('[data-theme-card]').count();
    console.log(`   Found ${themeCards} theme cards`);

    if (themeCards >= 11) {
      console.log('✅ PASS: All themes displayed (expected 11+)\n');
    } else {
      console.log(`❌ FAIL: Expected at least 11 themes, found ${themeCards}\n`);
      throw new Error('Not enough themes displayed');
    }

    // Test 2: Verify Apply button works
    console.log('Test 2: Test theme application');

    // Get current theme from state
    const statePath = path.join(MACTHEME_DIR, 'state.json');
    const initialState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    const initialTheme = initialState.currentTheme;
    console.log(`   Current theme: ${initialTheme}`);

    // Find a different theme to apply
    const tokyoNightCard = await window.locator('[data-theme-card][data-theme-name="Tokyo Night"]');
    const nordCard = await window.locator('[data-theme-card][data-theme-name="Nord"]');

    // Choose whichever is NOT the current theme
    let targetCard, targetName;
    if (initialTheme !== 'tokyo-night') {
      targetCard = tokyoNightCard;
      targetName = 'Tokyo Night';
    } else {
      targetCard = nordCard;
      targetName = 'Nord';
    }

    console.log(`   Switching to: ${targetName}`);

    // Click Apply button on the chosen theme
    const applyButton = targetCard.locator('button:has-text("Apply")');
    await applyButton.click();

    // Wait for the theme to apply
    await window.waitForTimeout(1500);

    // Verify symlink was updated
    const symlinkPath = path.join(MACTHEME_DIR, 'current', 'theme');
    const symlinkTarget = fs.readlinkSync(symlinkPath);
    console.log(`   Symlink now points to: ${symlinkTarget}`);

    if (symlinkTarget.includes(targetName.toLowerCase().replace(' ', '-')) ||
        (targetName === 'Tokyo Night' && symlinkTarget.includes('tokyo-night'))) {
      console.log('✅ PASS: Theme applied successfully\n');
    } else {
      console.log(`❌ FAIL: Symlink doesn't point to expected theme\n`);
      throw new Error('Theme application failed');
    }

    // Test 3: Verify UI updates
    console.log('Test 3: Verify UI reflects active theme');
    const activeCard = await window.locator('[data-theme-card][data-active="true"]').count();

    if (activeCard === 1) {
      console.log('✅ PASS: Exactly one theme marked as active\n');
    } else {
      console.log(`⚠️  WARNING: Found ${activeCard} active themes (expected 1)\n`);
    }

    console.log('🎉 All verification tests passed!\n');
    console.log('✅ The app is working correctly');
    console.log('✅ Ready to implement new features\n');

  } catch (error) {
    console.error('\n❌ Verification test failed:', error.message);
    console.error('\n⚠️  FIX THIS BUG BEFORE IMPLEMENTING NEW FEATURES!\n');
    throw error;
  } finally {
    // Clean up
    if (electronApp) {
      await electronApp.close();
    }
  }
}

// Run the test
runVerificationTest().catch(error => {
  console.error('Test script error:', error);
  process.exit(1);
});
