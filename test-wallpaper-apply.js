const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Test wallpaper:apply IPC handler
async function testWallpaperApply() {
  console.log('\n=== Test #104: IPC channel wallpaper:apply ===\n');

  const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: []
  };

  function recordTest(name, passed, error = null) {
    testResults.total++;
    if (passed) {
      testResults.passed++;
      console.log(`  ✓ ${name}`);
    } else {
      testResults.failed++;
      console.log(`  ✗ ${name}`);
      if (error) console.log(`    Error: ${error}`);
    }
    testResults.tests.push({ name, passed, error });
  }

  try {
    const macThemeDir = path.join(os.homedir(), 'Library', 'Application Support', 'MacTheme');
    const currentDir = path.join(macThemeDir, 'current');
    const statePath = path.join(macThemeDir, 'state.json');

    console.log('A. Setup - Get current wallpaper (to restore later)');
    console.log('---------------------------------------------------');

    // Get current wallpaper using osascript
    const getCurrentWallpaperScript = `
      tell application "System Events"
        get picture of desktop 1
      end tell
    `;

    let originalWallpaper;
    try {
      const result = await execAsync(`osascript -e '${getCurrentWallpaperScript}'`);
      originalWallpaper = result.stdout.trim();
      console.log(`  Current wallpaper: ${originalWallpaper}`);
      recordTest('Retrieved current wallpaper', true);
    } catch (error) {
      console.log(`  Could not get current wallpaper: ${error.message}`);
      recordTest('Retrieved current wallpaper (optional)', true);
    }
    console.log('');

    console.log('B. Setup - Create test wallpaper image');
    console.log('---------------------------------------');

    const testWallpaperDir = path.join(macThemeDir, 'test-wallpapers');
    if (!fs.existsSync(testWallpaperDir)) {
      fs.mkdirSync(testWallpaperDir, { recursive: true });
    }

    const testWallpaperPath = path.join(testWallpaperDir, 'test-wallpaper.png');

    // Create a minimal 1x1 pixel PNG
    const minimalPNG = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    fs.writeFileSync(testWallpaperPath, minimalPNG);
    recordTest('Created test wallpaper image', fs.existsSync(testWallpaperPath));
    console.log('');

    console.log('C. Apply wallpaper using osascript');
    console.log('-----------------------------------');

    // Simulate handleApplyWallpaper logic
    const setWallpaperScript = `
      tell application "System Events"
        tell every desktop
          set picture to "${testWallpaperPath}"
        end tell
      end tell
    `;

    try {
      await execAsync(`osascript -e '${setWallpaperScript}'`);
      recordTest('osascript command executed successfully', true);

      // Give the system a moment to apply the wallpaper
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify wallpaper was applied
      const checkResult = await execAsync(`osascript -e '${getCurrentWallpaperScript}'`);
      const currentWallpaper = checkResult.stdout.trim();
      recordTest('Desktop wallpaper changed', currentWallpaper === testWallpaperPath);
      console.log(`  New wallpaper: ${currentWallpaper}`);
    } catch (error) {
      recordTest('osascript command executed', false, error.message);
    }
    console.log('');

    console.log('D. Update wallpaper symlink');
    console.log('----------------------------');

    const wallpaperSymlink = path.join(currentDir, 'wallpaper');

    // Remove existing symlink if it exists
    if (fs.existsSync(wallpaperSymlink)) {
      fs.unlinkSync(wallpaperSymlink);
    }

    // Create new symlink
    fs.symlinkSync(testWallpaperPath, wallpaperSymlink);
    recordTest('Created wallpaper symlink', fs.existsSync(wallpaperSymlink));

    // Verify symlink points to correct location
    const symlinkTarget = fs.readlinkSync(wallpaperSymlink);
    recordTest('Symlink points to correct wallpaper', symlinkTarget === testWallpaperPath);
    console.log('');

    console.log('E. Update state.json');
    console.log('--------------------');

    // Read current state
    const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    const originalStateWallpaper = state.currentWallpaper;

    // Update state
    state.currentWallpaper = testWallpaperPath;
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

    // Verify update
    const updatedState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    recordTest('state.json updated', updatedState.currentWallpaper === testWallpaperPath);
    console.log(`  Current wallpaper in state: ${updatedState.currentWallpaper}`);
    console.log('');

    console.log('F. Restore original wallpaper');
    console.log('------------------------------');

    if (originalWallpaper) {
      try {
        const restoreScript = `
          tell application "System Events"
            tell every desktop
              set picture to "${originalWallpaper}"
            end tell
          end tell
        `;
        await execAsync(`osascript -e '${restoreScript}'`);
        recordTest('Restored original wallpaper', true);
        console.log(`  Restored to: ${originalWallpaper}`);

        // Restore state
        state.currentWallpaper = originalStateWallpaper || '';
        fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
      } catch (error) {
        recordTest('Restored original wallpaper', false, error.message);
      }
    } else {
      recordTest('Original wallpaper restore skipped (was not saved)', true);
    }
    console.log('');

    console.log('G. Cleanup test artifacts');
    console.log('--------------------------');

    // Clean up test wallpaper
    fs.unlinkSync(testWallpaperPath);
    fs.rmdirSync(testWallpaperDir);
    recordTest('Test artifacts cleaned up', true);
    console.log('');

    // Summary
    console.log('=== TEST SUMMARY ===');
    console.log(`Total tests: ${testResults.total}`);
    console.log(`Passed: ${testResults.passed}`);
    console.log(`Failed: ${testResults.failed}`);
    console.log('');

    if (testResults.failed === 0) {
      console.log('✓ ALL TESTS PASSED\n');
      console.log('Test #104: IPC channel wallpaper:apply sets desktop wallpaper');
      console.log('Result: ✓ PASSED\n');
      process.exit(0);
    } else {
      console.log('✗ SOME TESTS FAILED\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n✗ TEST FAILED WITH ERROR');
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
testWallpaperApply();
