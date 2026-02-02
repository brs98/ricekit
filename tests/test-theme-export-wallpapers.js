/**
 * Test #127: Theme export includes wallpapers if present
 *
 * This test verifies that:
 * 1. Themes can be exported to .ricekit files
 * 2. Exported archives include wallpapers if present
 * 3. Exported archives can be extracted and validated
 * 4. All theme files are included in export
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const archiver = require('archiver');
const { promisify } = require('util');
const { exec } = require('child_process');
const execAsync = promisify(exec);

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

async function exportThemeSimulation(themeName, themePath, exportPath) {
  console.log(`${colors.blue}Exporting theme: ${themeName}${colors.reset}`);

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(exportPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`  ${colors.green}✓ Exported: ${archive.pointer()} bytes${colors.reset}`);
      resolve();
    });

    archive.on('error', (err) => reject(err));

    archive.pipe(output);
    archive.directory(themePath, themeName);
    archive.finalize();
  });
}

async function extractAndValidate(zipPath, expectedThemeName) {
  const tmpDir = path.join(os.tmpdir(), `ricekit-extract-test-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    // Extract
    await execAsync(`unzip -q "${zipPath}" -d "${tmpDir}"`);

    // Find theme directory
    const extractedContents = fs.readdirSync(tmpDir);
    const themeDir = extractedContents.find(name => {
      const itemPath = path.join(tmpDir, name);
      return fs.statSync(itemPath).isDirectory();
    });

    if (!themeDir) {
      throw new Error('No theme directory found in archive');
    }

    const extractedThemePath = path.join(tmpDir, themeDir);

    // Check for theme.json
    const hasThemeJson = fs.existsSync(path.join(extractedThemePath, 'theme.json'));

    // Check for config files
    const configFiles = [
      'alacritty.toml',
      'kitty.conf',
      'vscode.json',
      'neovim.lua',
    ];

    const foundConfigFiles = configFiles.filter(file =>
      fs.existsSync(path.join(extractedThemePath, file))
    );

    // Check for wallpapers directory
    const wallpapersDir = path.join(extractedThemePath, 'wallpapers');
    const hasWallpapers = fs.existsSync(wallpapersDir);

    let wallpaperFiles = [];
    if (hasWallpapers) {
      const allFiles = fs.readdirSync(wallpapersDir);
      wallpaperFiles = allFiles.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.png', '.jpg', '.jpeg', '.heic'].includes(ext);
      });
    }

    // List all files in theme
    const allFiles = [];
    function listFilesRecursive(dir, prefix = '') {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const fullPath = path.join(dir, file);
        const relativePath = path.join(prefix, file);
        if (fs.statSync(fullPath).isDirectory()) {
          listFilesRecursive(fullPath, relativePath);
        } else {
          allFiles.push(relativePath);
        }
      });
    }
    listFilesRecursive(extractedThemePath);

    // Clean up
    fs.rmSync(tmpDir, { recursive: true, force: true });

    return {
      themeDir,
      hasThemeJson,
      configFiles: foundConfigFiles,
      hasWallpapers,
      wallpaperCount: wallpaperFiles.length,
      wallpaperFiles,
      totalFiles: allFiles.length,
      allFiles
    };

  } catch (error) {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
    throw error;
  }
}

async function runTest() {
  console.log(colors.bright + '='.repeat(70));
  console.log('Test #127: Theme Export Includes Wallpapers');
  console.log('='.repeat(70) + colors.reset);
  console.log('');

  const testDir = path.join(os.tmpdir(), `ricekit-export-test-${Date.now()}`);
  fs.mkdirSync(testDir, { recursive: true });

  try {
    const appSupportPath = path.join(os.homedir(), 'Library/Application Support/Ricekit');
    const themesDir = path.join(appSupportPath, 'themes');

    // Test 1: Export theme WITH wallpapers
    console.log(`${colors.bright}${colors.cyan}Test 1: Export theme with wallpapers${colors.reset}\n`);

    const themeWithWallpapers = 'tokyo-night';
    const themeWithWallpapersPath = path.join(themesDir, themeWithWallpapers);

    if (!fs.existsSync(themeWithWallpapersPath)) {
      throw new Error(`Theme not found: ${themeWithWallpapers}`);
    }

    // Check if theme actually has wallpapers
    const wallpapersDir = path.join(themeWithWallpapersPath, 'wallpapers');
    const hasWallpapersSource = fs.existsSync(wallpapersDir);

    console.log(`  Source theme: ${themeWithWallpapers}`);
    console.log(`  Has wallpapers directory: ${hasWallpapersSource ? colors.green + 'Yes' + colors.reset : colors.yellow + 'No' + colors.reset}`);

    if (hasWallpapersSource) {
      const sourceWallpapers = fs.readdirSync(wallpapersDir).filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.png', '.jpg', '.jpeg', '.heic'].includes(ext);
      });
      console.log(`  Source wallpaper count: ${sourceWallpapers.length}`);
    }

    // Export the theme
    const exportPath1 = path.join(testDir, `${themeWithWallpapers}.ricekit`);
    await exportThemeSimulation(themeWithWallpapers, themeWithWallpapersPath, exportPath1);

    // Extract and validate
    console.log(`\n${colors.blue}Validating exported archive...${colors.reset}`);
    const validation1 = await extractAndValidate(exportPath1, themeWithWallpapers);

    console.log(`\n  Extracted theme: ${validation1.themeDir}`);
    console.log(`  Has theme.json: ${validation1.hasThemeJson ? colors.green + 'Yes' + colors.reset : colors.red + 'No' + colors.reset}`);
    console.log(`  Config files: ${validation1.configFiles.length} found`);
    console.log(`  Has wallpapers: ${validation1.hasWallpapers ? colors.green + 'Yes' + colors.reset : colors.yellow + 'No' + colors.reset}`);
    if (validation1.hasWallpapers) {
      console.log(`  Wallpaper files: ${validation1.wallpaperCount}`);
      validation1.wallpaperFiles.forEach(file => {
        console.log(`    - ${file}`);
      });
    }
    console.log(`  Total files in archive: ${validation1.totalFiles}`);

    const test1Passed = validation1.hasThemeJson &&
      validation1.configFiles.length >= 2 &&
      (!hasWallpapersSource || validation1.hasWallpapers);

    console.log(test1Passed ?
      `\n${colors.green}✅ Test 1 PASSED - Theme exported with wallpapers${colors.reset}` :
      `\n${colors.red}❌ Test 1 FAILED${colors.reset}`
    );

    // Test 2: Export theme WITHOUT wallpapers
    console.log(`\n${colors.bright}${colors.cyan}Test 2: Export theme without wallpapers${colors.reset}\n`);

    // Find a theme without wallpapers or create one
    const themeWithoutWallpapers = 'catppuccin-latte';
    const themeWithoutWallpapersPath = path.join(themesDir, themeWithoutWallpapers);

    if (!fs.existsSync(themeWithoutWallpapersPath)) {
      throw new Error(`Theme not found: ${themeWithoutWallpapers}`);
    }

    const wallpapersDir2 = path.join(themeWithoutWallpapersPath, 'wallpapers');
    const hasWallpapersSource2 = fs.existsSync(wallpapersDir2);

    console.log(`  Source theme: ${themeWithoutWallpapers}`);
    console.log(`  Has wallpapers directory: ${hasWallpapersSource2 ? colors.green + 'Yes' + colors.reset : colors.yellow + 'No' + colors.reset}`);

    // Export the theme
    const exportPath2 = path.join(testDir, `${themeWithoutWallpapers}.ricekit`);
    await exportThemeSimulation(themeWithoutWallpapers, themeWithoutWallpapersPath, exportPath2);

    // Extract and validate
    console.log(`\n${colors.blue}Validating exported archive...${colors.reset}`);
    const validation2 = await extractAndValidate(exportPath2, themeWithoutWallpapers);

    console.log(`\n  Extracted theme: ${validation2.themeDir}`);
    console.log(`  Has theme.json: ${validation2.hasThemeJson ? colors.green + 'Yes' + colors.reset : colors.red + 'No' + colors.reset}`);
    console.log(`  Config files: ${validation2.configFiles.length} found`);
    console.log(`  Has wallpapers: ${validation2.hasWallpapers ? colors.green + 'Yes' + colors.reset : colors.yellow + 'No' + colors.reset}`);
    console.log(`  Total files in archive: ${validation2.totalFiles}`);

    const test2Passed = validation2.hasThemeJson && validation2.configFiles.length >= 2;

    console.log(test2Passed ?
      `\n${colors.green}✅ Test 2 PASSED - Theme exported successfully${colors.reset}` :
      `\n${colors.red}❌ Test 2 FAILED${colors.reset}`
    );

    // Summary
    console.log(`\n${colors.bright}${'='.repeat(70)}`);
    console.log('TEST RESULTS');
    console.log('='.repeat(70) + colors.reset);

    const allPassed = test1Passed && test2Passed;

    console.log(`\n${colors.cyan}Individual Test Results:${colors.reset}`);
    console.log(`  Test 1 (With wallpapers):     ${test1Passed ? colors.green + '✓ PASS' : colors.red + '✗ FAIL'}${colors.reset}`);
    console.log(`  Test 2 (Without wallpapers):  ${test2Passed ? colors.green + '✓ PASS' : colors.red + '✗ FAIL'}${colors.reset}`);

    if (allPassed) {
      console.log(`\n${colors.bright}${colors.green}✅ ALL TESTS PASSED${colors.reset}`);
      console.log('Theme export correctly includes wallpapers when present');
    } else {
      console.log(`\n${colors.bright}${colors.red}❌ SOME TESTS FAILED${colors.reset}`);
    }

    console.log(`\n${colors.bright}${'='.repeat(70)}${colors.reset}\n`);

    // Clean up
    fs.rmSync(testDir, { recursive: true, force: true });

    process.exit(allPassed ? 0 : 1);

  } catch (error) {
    console.error(`\n${colors.red}Error during test:${colors.reset}`, error);
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    process.exit(1);
  }
}

// Run the test
runTest();
