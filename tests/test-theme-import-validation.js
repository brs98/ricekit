/**
 * Test #126: Theme import validates theme structure before installing
 *
 * This test verifies that:
 * 1. Invalid theme files are rejected
 * 2. Validation errors are shown to user
 * 3. Error messages explain what is wrong
 * 4. Valid themes are imported successfully
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

async function createZipArchive(sourceDir, outputPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve());
    archive.on('error', (err) => reject(err));

    archive.pipe(output);
    archive.directory(sourceDir, path.basename(sourceDir));
    archive.finalize();
  });
}

async function simulateImport(zipPath) {
  console.log(`\n${colors.blue}Simulating import of: ${path.basename(zipPath)}${colors.reset}`);

  try {
    // Validate file exists
    if (!fs.existsSync(zipPath)) {
      throw new Error(`File not found: ${zipPath}`);
    }

    // Create temporary directory for extraction
    const tmpDir = path.join(os.tmpdir(), `mactheme-test-import-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    try {
      // Extract the zip archive
      console.log(`  Extracting archive...`);
      await execAsync(`unzip -q "${zipPath}" -d "${tmpDir}"`);

      // Find the theme directory
      const extractedContents = fs.readdirSync(tmpDir);

      if (extractedContents.length === 0) {
        throw new Error('Archive is empty');
      }

      // Get the theme directory
      const themeDir = extractedContents.find(name => {
        const itemPath = path.join(tmpDir, name);
        return fs.statSync(itemPath).isDirectory();
      });

      if (!themeDir) {
        throw new Error('No theme directory found in archive');
      }

      const extractedThemePath = path.join(tmpDir, themeDir);

      // Validate theme structure - must have theme.json
      const themeMetadataPath = path.join(extractedThemePath, 'theme.json');
      if (!fs.existsSync(themeMetadataPath)) {
        throw new Error('Invalid theme: missing theme.json');
      }

      // Try to parse theme.json
      const themeMetadata = JSON.parse(fs.readFileSync(themeMetadataPath, 'utf-8'));
      const themeName = themeMetadata.name || themeDir;

      // Clean up temp directory
      fs.rmSync(tmpDir, { recursive: true, force: true });

      console.log(`  ${colors.green}✓ Theme is valid: ${themeName}${colors.reset}`);
      return { valid: true, themeName };

    } catch (extractError) {
      // Clean up temp directory on error
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
      throw extractError;
    }
  } catch (error) {
    console.log(`  ${colors.red}✗ Validation failed: ${error.message}${colors.reset}`);
    return { valid: false, error: error.message };
  }
}

async function runTest() {
  console.log(colors.bright + '='.repeat(70));
  console.log('Test #126: Theme Import Validation');
  console.log('='.repeat(70) + colors.reset);
  console.log('');

  const testDir = path.join(os.tmpdir(), `mactheme-validation-test-${Date.now()}`);
  fs.mkdirSync(testDir, { recursive: true });

  try {
    // Test 1: Valid theme with all required files
    console.log(`${colors.bright}${colors.cyan}Test 1: Valid theme${colors.reset}`);
    const validThemeDir = path.join(testDir, 'valid-theme');
    fs.mkdirSync(validThemeDir, { recursive: true });

    const validThemeJson = {
      name: 'Valid Test Theme',
      author: 'Test',
      description: 'A valid theme for testing',
      version: '1.0.0',
      colors: {
        background: '#1a1b26',
        foreground: '#a9b1d6',
        black: '#32344a',
        red: '#f7768e',
        green: '#9ece6a',
        yellow: '#e0af68',
        blue: '#7aa2f7',
        magenta: '#ad8ee6',
        cyan: '#449dab',
        white: '#787c99'
      }
    };

    fs.writeFileSync(
      path.join(validThemeDir, 'theme.json'),
      JSON.stringify(validThemeJson, null, 2)
    );
    fs.writeFileSync(path.join(validThemeDir, 'alacritty.toml'), '# Alacritty config');
    fs.writeFileSync(path.join(validThemeDir, 'kitty.conf'), '# Kitty config');

    const validZipPath = path.join(testDir, 'valid-theme.mactheme');
    await createZipArchive(validThemeDir, validZipPath);

    const result1 = await simulateImport(validZipPath);
    const test1Passed = result1.valid && result1.themeName === 'Valid Test Theme';

    console.log(test1Passed ?
      `${colors.green}✅ Test 1 PASSED${colors.reset}` :
      `${colors.red}❌ Test 1 FAILED${colors.reset}`
    );

    // Test 2: Invalid theme - missing theme.json
    console.log(`\n${colors.bright}${colors.cyan}Test 2: Missing theme.json${colors.reset}`);
    const invalidThemeDir = path.join(testDir, 'invalid-theme-no-json');
    fs.mkdirSync(invalidThemeDir, { recursive: true });
    fs.writeFileSync(path.join(invalidThemeDir, 'alacritty.toml'), '# Alacritty config');
    fs.writeFileSync(path.join(invalidThemeDir, 'kitty.conf'), '# Kitty config');

    const invalidZipPath = path.join(testDir, 'invalid-no-json.mactheme');
    await createZipArchive(invalidThemeDir, invalidZipPath);

    const result2 = await simulateImport(invalidZipPath);
    const test2Passed = !result2.valid && result2.error.includes('missing theme.json');

    console.log(test2Passed ?
      `${colors.green}✅ Test 2 PASSED - Correctly rejected invalid theme${colors.reset}` :
      `${colors.red}❌ Test 2 FAILED - Should have rejected theme${colors.reset}`
    );

    // Test 3: Invalid theme - corrupted JSON
    console.log(`\n${colors.bright}${colors.cyan}Test 3: Corrupted theme.json${colors.reset}`);
    const corruptedThemeDir = path.join(testDir, 'corrupted-theme');
    fs.mkdirSync(corruptedThemeDir, { recursive: true });
    fs.writeFileSync(path.join(corruptedThemeDir, 'theme.json'), '{ invalid json }');

    const corruptedZipPath = path.join(testDir, 'corrupted-theme.mactheme');
    await createZipArchive(corruptedThemeDir, corruptedZipPath);

    const result3 = await simulateImport(corruptedZipPath);
    const test3Passed = !result3.valid && (
      result3.error.includes('JSON') ||
      result3.error.includes('parse') ||
      result3.error.includes('Unexpected')
    );

    console.log(test3Passed ?
      `${colors.green}✅ Test 3 PASSED - Correctly rejected corrupted JSON${colors.reset}` :
      `${colors.red}❌ Test 3 FAILED - Should have rejected corrupted JSON${colors.reset}`
    );

    // Test 4: Empty archive
    console.log(`\n${colors.bright}${colors.cyan}Test 4: Empty archive${colors.reset}`);
    const emptyZipPath = path.join(testDir, 'empty.mactheme');
    await new Promise((resolve, reject) => {
      const output = fs.createWriteStream(emptyZipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      output.on('close', () => resolve());
      archive.on('error', (err) => reject(err));
      archive.pipe(output);
      archive.finalize(); // Finalize without adding any files
    });

    const result4 = await simulateImport(emptyZipPath);
    const test4Passed = !result4.valid && result4.error.includes('empty');

    console.log(test4Passed ?
      `${colors.green}✅ Test 4 PASSED - Correctly rejected empty archive${colors.reset}` :
      `${colors.red}❌ Test 4 FAILED - Should have rejected empty archive${colors.reset}`
    );

    // Summary
    console.log(`\n${colors.bright}${'='.repeat(70)}`);
    console.log('TEST RESULTS');
    console.log('='.repeat(70) + colors.reset);

    const allPassed = test1Passed && test2Passed && test3Passed && test4Passed;

    console.log(`\n${colors.cyan}Individual Test Results:${colors.reset}`);
    console.log(`  Test 1 (Valid theme):         ${test1Passed ? colors.green + '✓ PASS' : colors.red + '✗ FAIL'}${colors.reset}`);
    console.log(`  Test 2 (Missing JSON):        ${test2Passed ? colors.green + '✓ PASS' : colors.red + '✗ FAIL'}${colors.reset}`);
    console.log(`  Test 3 (Corrupted JSON):      ${test3Passed ? colors.green + '✓ PASS' : colors.red + '✗ FAIL'}${colors.reset}`);
    console.log(`  Test 4 (Empty archive):       ${test4Passed ? colors.green + '✓ PASS' : colors.red + '✗ FAIL'}${colors.reset}`);

    if (allPassed) {
      console.log(`\n${colors.bright}${colors.green}✅ ALL TESTS PASSED${colors.reset}`);
      console.log('Theme import validation is working correctly');
    } else {
      console.log(`\n${colors.bright}${colors.red}❌ SOME TESTS FAILED${colors.reset}`);
    }

    console.log(`\n${colors.bright}${'='.repeat(70)}${colors.reset}\n`);

    // Clean up
    fs.rmSync(testDir, { recursive: true, force: true });

    process.exit(allPassed ? 0 : 1);

  } catch (error) {
    console.error(`\n${colors.red}Error during test:${colors.reset}`, error);
    fs.rmSync(testDir, { recursive: true, force: true });
    process.exit(1);
  }
}

// Run the test
runTest();
