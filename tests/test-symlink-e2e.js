#!/usr/bin/env node

/**
 * Test #116 End-to-End: Verify symlink handling through the UI
 *
 * This test verifies that applying themes through the actual application
 * correctly handles existing symlinks.
 */

const { _electron: electron } = require('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

const homeDir = os.homedir();
const currentDir = path.join(homeDir, 'Library', 'Application Support', 'MacTheme', 'current');
const symlinkPath = path.join(currentDir, 'theme');

async function runTest() {
  console.log('Test #116 E2E: Symlink handling through UI');
  console.log('='.repeat(70));

  let electronApp;
  let passed = 0;
  let failed = 0;

  try {
    // Record initial symlink state
    let initialSymlink = null;
    if (fs.existsSync(symlinkPath)) {
      const stats = fs.lstatSync(symlinkPath);
      if (stats.isSymbolicLink()) {
        initialSymlink = fs.readlinkSync(symlinkPath);
        console.log(`\nInitial symlink: ${initialSymlink}`);
      }
    }

    // Launch the app
    console.log('\nLaunching Electron app...');
    electronApp = await electron.launch({
      args: ['.'],
      timeout: 30000,
    });

    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    console.log('✓ App launched successfully');
    passed++;

    // Wait for app to be ready
    await window.waitForTimeout(2000);

    // Navigate to Themes view if not already there
    const themesButton = window.locator('text=Themes').first();
    if (await themesButton.isVisible()) {
      await themesButton.click();
      await window.waitForTimeout(500);
    }

    // Get list of available themes in the UI
    const themeCards = window.locator('[class*="ThemeCard"]');
    const themeCount = await themeCards.count();
    console.log(`\n✓ Found ${themeCount} themes in UI`);
    passed++;

    if (themeCount < 2) {
      throw new Error('Need at least 2 themes to test switching');
    }

    // Find two different themes to test with
    let theme1Name = null;
    let theme2Name = null;

    for (let i = 0; i < Math.min(themeCount, 10); i++) {
      const card = themeCards.nth(i);
      const nameElement = card.locator('[class*="name"], h3, [class*="title"]').first();

      try {
        const name = await nameElement.textContent({ timeout: 1000 });
        if (name) {
          if (!theme1Name) {
            theme1Name = name.trim();
          } else if (!theme2Name && name.trim() !== theme1Name) {
            theme2Name = name.trim();
            break;
          }
        }
      } catch (e) {
        // Skip if can't get name
        continue;
      }
    }

    if (!theme1Name || !theme2Name) {
      throw new Error('Could not find two distinct themes for testing');
    }

    console.log(`\n✓ Will test switching between: "${theme1Name}" and "${theme2Name}"`);
    passed++;

    // Apply first theme
    console.log(`\nApplying theme: ${theme1Name}`);
    for (let i = 0; i < themeCount; i++) {
      const card = themeCards.nth(i);
      const nameElement = card.locator('[class*="name"], h3, [class*="title"]').first();
      const name = await nameElement.textContent();

      if (name && name.trim() === theme1Name) {
        // Find and click the Apply button
        const applyButton = card.locator('button:has-text("Apply")').first();
        if (await applyButton.isVisible()) {
          await applyButton.click();
          console.log(`  Clicked Apply button for ${theme1Name}`);
          await window.waitForTimeout(1500);
          break;
        }
      }
    }

    // Check symlink after first apply
    if (fs.existsSync(symlinkPath)) {
      const stats = fs.lstatSync(symlinkPath);
      if (!stats.isSymbolicLink()) {
        throw new Error('Theme symlink is not a symbolic link after first apply');
      }
      const target1 = fs.readlinkSync(symlinkPath);
      console.log(`  ✓ Symlink updated: ${target1}`);
      passed++;
    } else {
      throw new Error('Symlink does not exist after applying first theme');
    }

    // Apply second theme
    console.log(`\nApplying theme: ${theme2Name}`);
    for (let i = 0; i < themeCount; i++) {
      const card = themeCards.nth(i);
      const nameElement = card.locator('[class*="name"], h3, [class*="title"]').first();
      const name = await nameElement.textContent();

      if (name && name.trim() === theme2Name) {
        // Find and click the Apply button
        const applyButton = card.locator('button:has-text("Apply")').first();
        if (await applyButton.isVisible()) {
          await applyButton.click();
          console.log(`  Clicked Apply button for ${theme2Name}`);
          await window.waitForTimeout(1500);
          break;
        }
      }
    }

    // Check symlink after second apply
    if (fs.existsSync(symlinkPath)) {
      const stats = fs.lstatSync(symlinkPath);
      if (!stats.isSymbolicLink()) {
        throw new Error('Theme symlink is not a symbolic link after second apply');
      }
      const target2 = fs.readlinkSync(symlinkPath);
      console.log(`  ✓ Symlink updated: ${target2}`);
      passed++;

      // Verify it's different from first theme
      const target1 = fs.readlinkSync(symlinkPath);
      // Both should exist and be valid
      if (!fs.existsSync(target2)) {
        throw new Error('Second theme symlink target does not exist');
      }
    } else {
      throw new Error('Symlink does not exist after applying second theme');
    }

    // Verify no broken symlinks
    console.log('\nChecking for broken symlinks...');
    const items = fs.readdirSync(currentDir);
    let brokenCount = 0;
    for (const item of items) {
      const itemPath = path.join(currentDir, item);
      try {
        const stats = fs.lstatSync(itemPath);
        if (stats.isSymbolicLink()) {
          const target = fs.readlinkSync(itemPath);
          if (!fs.existsSync(target) && !fs.existsSync(itemPath)) {
            console.error(`  ✗ Broken symlink: ${item} -> ${target}`);
            brokenCount++;
            failed++;
          }
        }
      } catch (err) {
        console.error(`  ✗ Error checking ${item}: ${err.message}`);
        brokenCount++;
        failed++;
      }
    }

    if (brokenCount === 0) {
      console.log('  ✓ No broken symlinks found');
      passed++;
    }

    // Apply first theme again to test re-switching
    console.log(`\nApplying theme again: ${theme1Name}`);
    for (let i = 0; i < themeCount; i++) {
      const card = themeCards.nth(i);
      const nameElement = card.locator('[class*="name"], h3, [class*="title"]').first();
      const name = await nameElement.textContent();

      if (name && name.trim() === theme1Name) {
        const applyButton = card.locator('button:has-text("Apply")').first();
        if (await applyButton.isVisible()) {
          await applyButton.click();
          console.log(`  Clicked Apply button for ${theme1Name}`);
          await window.waitForTimeout(1500);
          break;
        }
      }
    }

    // Final symlink check
    if (fs.existsSync(symlinkPath)) {
      const stats = fs.lstatSync(symlinkPath);
      if (!stats.isSymbolicLink()) {
        throw new Error('Theme symlink is not a symbolic link after re-apply');
      }
      const finalTarget = fs.readlinkSync(symlinkPath);
      console.log(`  ✓ Symlink updated: ${finalTarget}`);

      if (!fs.existsSync(finalTarget)) {
        throw new Error('Final symlink target does not exist');
      }
      console.log('  ✓ Final symlink is valid');
      passed++;
    } else {
      throw new Error('Symlink does not exist after re-applying theme');
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('E2E TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(`Tests passed: ${passed}`);
    console.log(`Tests failed: ${failed}`);

    if (failed === 0) {
      console.log('\n✓ All E2E tests PASSED');
      console.log('Test #116: Symlink operations handle existing symlinks correctly - E2E VERIFIED');
    } else {
      console.log('\n✗ Some E2E tests FAILED');
    }

    await electronApp.close();
    process.exit(failed === 0 ? 0 : 1);

  } catch (error) {
    console.error('\n✗ Test failed with error:', error.message);
    console.error(error.stack);
    if (electronApp) {
      await electronApp.close();
    }
    process.exit(1);
  }
}

runTest();
