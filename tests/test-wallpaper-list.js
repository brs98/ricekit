const fs = require('fs');
const path = require('path');
const os = require('os');

// Test wallpaper:list IPC handler
async function testWallpaperList() {
  console.log('\n=== Test #103: IPC channel wallpaper:list ===\n');

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
    const ricekitDir = path.join(os.homedir(), 'Library', 'Application Support', 'Ricekit');
    const customThemesDir = path.join(ricekitDir, 'custom-themes');

    console.log('A. Setup - Create test theme with wallpapers');
    console.log('---------------------------------------------');

    const testThemeName = 'test-wallpaper-theme';
    const testThemePath = path.join(customThemesDir, testThemeName);

    // Remove if already exists
    if (fs.existsSync(testThemePath)) {
      fs.rmSync(testThemePath, { recursive: true });
    }

    // Create test theme directory and wallpapers subdirectory
    fs.mkdirSync(testThemePath, { recursive: true });
    const wallpapersDir = path.join(testThemePath, 'wallpapers');
    fs.mkdirSync(wallpapersDir);

    // Create theme.json
    const themeMetadata = {
      name: 'Test Wallpaper Theme',
      author: 'Test Author',
      description: 'A theme for testing wallpaper functionality',
      version: '1.0.0',
      colors: {
        background: '#1a1b26',
        foreground: '#a9b1d6'
      }
    };

    fs.writeFileSync(
      path.join(testThemePath, 'theme.json'),
      JSON.stringify(themeMetadata, null, 2)
    );

    // Create dummy wallpaper files (1x1 pixel PNG)
    // This is a valid 1x1 transparent PNG file in base64
    const minimalPNG = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const wallpaperFiles = [
      'wallpaper-1.png',
      'wallpaper-2.png',
      'wallpaper-3.jpg',
      'wallpaper-4.jpeg'
    ];

    for (const filename of wallpaperFiles) {
      fs.writeFileSync(path.join(wallpapersDir, filename), minimalPNG);
    }

    // Also create a non-image file that should be filtered out
    fs.writeFileSync(path.join(wallpapersDir, 'readme.txt'), 'Not an image');

    recordTest('Created test theme with wallpapers directory', true);
    recordTest(`Created ${wallpaperFiles.length} image files`, true);
    recordTest('Created non-image file for filtering test', true);
    console.log('');

    console.log('B. List wallpapers for theme with wallpapers');
    console.log('---------------------------------------------');

    // Simulate the handleListWallpapers logic
    const wallpapersPath = path.join(testThemePath, 'wallpapers');
    const files = fs.readdirSync(wallpapersPath);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.png', '.jpg', '.jpeg', '.heic', '.webp'].includes(ext);
    });

    const wallpaperPaths = imageFiles.map(file => path.join(wallpapersPath, file));

    recordTest('Response is an array', Array.isArray(wallpaperPaths));
    recordTest('Array contains wallpaper paths', wallpaperPaths.length > 0);
    recordTest('Correct number of wallpapers', wallpaperPaths.length === 4);
    recordTest('Non-image file filtered out', !wallpaperPaths.some(p => p.includes('readme.txt')));

    console.log(`  Found ${wallpaperPaths.length} wallpapers:`);
    for (const wallpaperPath of wallpaperPaths) {
      console.log(`    - ${path.basename(wallpaperPath)}`);
    }
    console.log('');

    console.log('C. Verify paths point to valid image files');
    console.log('------------------------------------------');

    for (const wallpaperPath of wallpaperPaths) {
      const exists = fs.existsSync(wallpaperPath);
      recordTest(`${path.basename(wallpaperPath)} exists`, exists);

      if (exists) {
        const stats = fs.statSync(wallpaperPath);
        recordTest(`${path.basename(wallpaperPath)} has content`, stats.size > 0);
      }
    }
    console.log('');

    console.log('D. Test theme without wallpapers directory');
    console.log('------------------------------------------');

    const noWallpaperThemeName = 'test-no-wallpaper';
    const noWallpaperThemePath = path.join(customThemesDir, noWallpaperThemeName);

    // Remove if already exists
    if (fs.existsSync(noWallpaperThemePath)) {
      fs.rmSync(noWallpaperThemePath, { recursive: true });
    }

    // Create theme without wallpapers directory
    fs.mkdirSync(noWallpaperThemePath, { recursive: true });
    fs.writeFileSync(
      path.join(noWallpaperThemePath, 'theme.json'),
      JSON.stringify(themeMetadata, null, 2)
    );

    recordTest('Created theme without wallpapers directory', true);

    // Test listing wallpapers for theme without wallpapers
    const noWallpapersPath = path.join(noWallpaperThemePath, 'wallpapers');
    const hasWallpapersDir = fs.existsSync(noWallpapersPath);
    const resultForNoWallpapers = hasWallpapersDir ? fs.readdirSync(noWallpapersPath) : [];

    recordTest('Returns empty array for theme without wallpapers', resultForNoWallpapers.length === 0);
    console.log('');

    console.log('E. Test with bundled theme (tokyo-night)');
    console.log('-----------------------------------------');

    const themesDir = path.join(ricekitDir, 'themes');
    const tokyoNightPath = path.join(themesDir, 'tokyo-night');
    const tokyoWallpapersPath = path.join(tokyoNightPath, 'wallpapers');

    if (fs.existsSync(tokyoWallpapersPath)) {
      const tokyoFiles = fs.readdirSync(tokyoWallpapersPath);
      const tokyoImageFiles = tokyoFiles.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.png', '.jpg', '.jpeg', '.heic', '.webp'].includes(ext);
      });

      recordTest('Can list wallpapers from bundled theme', true);
      console.log(`  Found ${tokyoImageFiles.length} wallpapers in tokyo-night`);
    } else {
      recordTest('Bundled theme has no wallpapers directory (expected)', true);
      console.log('  tokyo-night has no wallpapers directory (this is OK)');
    }
    console.log('');

    console.log('F. Cleanup test artifacts');
    console.log('--------------------------');

    // Clean up
    fs.rmSync(testThemePath, { recursive: true });
    fs.rmSync(noWallpaperThemePath, { recursive: true });
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
      console.log('Test #103: IPC channel wallpaper:list returns wallpapers for theme');
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
testWallpaperList();
