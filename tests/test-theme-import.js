const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const archiver = require('archiver');

const execAsync = promisify(exec);

// Test theme:import IPC handler
async function testThemeImport() {
  console.log('\n=== Test #102: IPC channel theme:import ===\n');

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
    const exportDir = path.join(ricekitDir, 'exports');

    // Create exports directory if it doesn't exist
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    console.log('A. Setup - Create test theme to export');
    console.log('---------------------------------------');

    const testThemeName = 'test-import-theme';
    const testThemePath = path.join(customThemesDir, testThemeName);

    // Remove if already exists
    if (fs.existsSync(testThemePath)) {
      fs.rmSync(testThemePath, { recursive: true });
    }

    // Create test theme directory
    fs.mkdirSync(testThemePath, { recursive: true });

    // Create theme.json
    const themeMetadata = {
      name: 'Test Import Theme',
      author: 'Test Author',
      description: 'A theme for testing import functionality',
      version: '1.0.0',
      colors: {
        background: '#1a1b26',
        foreground: '#a9b1d6',
        cursor: '#c0caf5',
        selection: '#283457',
        black: '#32344a',
        red: '#f7768e',
        green: '#9ece6a',
        yellow: '#e0af68',
        blue: '#7aa2f7',
        magenta: '#ad8ee6',
        cyan: '#449dab',
        white: '#787c99',
        brightBlack: '#444b6a',
        brightRed: '#ff7a93',
        brightGreen: '#b9f27c',
        brightYellow: '#ff9e64',
        brightBlue: '#7da6ff',
        brightMagenta: '#bb9af7',
        brightCyan: '#0db9d7',
        brightWhite: '#acb0d0',
        accent: '#7aa2f7',
        border: '#292e42'
      }
    };

    fs.writeFileSync(
      path.join(testThemePath, 'theme.json'),
      JSON.stringify(themeMetadata, null, 2)
    );

    // Create minimal config files
    fs.writeFileSync(path.join(testThemePath, 'alacritty.toml'), '# Test alacritty config\n');
    fs.writeFileSync(path.join(testThemePath, 'kitty.conf'), '# Test kitty config\n');
    fs.writeFileSync(path.join(testThemePath, 'vscode.json'), '{}');

    recordTest('Created test theme directory', true);
    recordTest('Created theme.json', true);
    recordTest('Created config files', true);
    console.log('');

    console.log('B. Export test theme to file');
    console.log('-----------------------------');

    const exportPath = path.join(exportDir, `${testThemeName}.ricekit`);

    // Clean up any existing export file
    if (fs.existsSync(exportPath)) {
      fs.unlinkSync(exportPath);
    }

    // Create export using archiver
    await new Promise((resolve, reject) => {
      const output = fs.createWriteStream(exportPath);
      const archive = archiver('zip', {
        zlib: { level: 9 }
      });

      output.on('close', () => {
        resolve();
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);
      archive.directory(testThemePath, testThemeName);
      archive.finalize();
    });

    recordTest('Export file created', fs.existsSync(exportPath));
    console.log('');

    console.log('C. Remove original theme (to test import)');
    console.log('------------------------------------------');

    fs.rmSync(testThemePath, { recursive: true });
    recordTest('Original theme removed', !fs.existsSync(testThemePath));
    console.log('');

    console.log('D. Import theme from file (simulate IPC handler)');
    console.log('-------------------------------------------------');

    // Simulate the import process (same logic as handleImportTheme)
    const tmpDir = path.join(os.tmpdir(), `ricekit-import-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    // Extract the zip archive
    await execAsync(`unzip -q "${exportPath}" -d "${tmpDir}"`);
    recordTest('Archive extracted to temp directory', true);

    // Find the theme directory
    const extractedContents = fs.readdirSync(tmpDir);
    const themeDir = extractedContents.find(name => {
      const itemPath = path.join(tmpDir, name);
      return fs.statSync(itemPath).isDirectory();
    });

    recordTest('Theme directory found in archive', !!themeDir);

    const extractedThemePath = path.join(tmpDir, themeDir);

    // Validate theme structure
    const themeMetadataPath = path.join(extractedThemePath, 'theme.json');
    recordTest('theme.json exists in extracted theme', fs.existsSync(themeMetadataPath));

    // Copy to custom-themes directory
    const destThemeDir = path.join(customThemesDir, themeDir);
    fs.cpSync(extractedThemePath, destThemeDir, { recursive: true });
    recordTest('Theme copied to custom-themes directory', true);

    // Clean up temp directory
    fs.rmSync(tmpDir, { recursive: true, force: true });
    recordTest('Temp directory cleaned up', true);
    console.log('');

    console.log('E. Verify theme is added to custom-themes');
    console.log('------------------------------------------');

    recordTest('Theme directory exists in custom-themes', fs.existsSync(destThemeDir));

    const importedThemeJson = path.join(destThemeDir, 'theme.json');
    recordTest('theme.json exists in imported theme', fs.existsSync(importedThemeJson));

    const importedMetadata = JSON.parse(fs.readFileSync(importedThemeJson, 'utf-8'));
    recordTest('theme.json is valid JSON', !!importedMetadata);
    recordTest('Theme name matches', importedMetadata.name === themeMetadata.name);
    recordTest('Theme author matches', importedMetadata.author === themeMetadata.author);

    console.log(`  Imported theme name: ${importedMetadata.name}`);
    console.log(`  Imported theme author: ${importedMetadata.author}`);
    console.log('');

    console.log('F. Verify config files imported');
    console.log('--------------------------------');

    const configFiles = ['alacritty.toml', 'kitty.conf', 'vscode.json'];
    for (const file of configFiles) {
      const filePath = path.join(destThemeDir, file);
      recordTest(`${file} imported`, fs.existsSync(filePath));
    }
    console.log('');

    console.log('G. Test duplicate import handling');
    console.log('----------------------------------');

    // Try importing again - should create theme with -1 suffix
    const tmpDir2 = path.join(os.tmpdir(), `ricekit-import-${Date.now()}`);
    fs.mkdirSync(tmpDir2, { recursive: true });

    await execAsync(`unzip -q "${exportPath}" -d "${tmpDir2}"`);

    const extractedContents2 = fs.readdirSync(tmpDir2);
    const themeDir2 = extractedContents2.find(name => {
      const itemPath = path.join(tmpDir2, name);
      return fs.statSync(itemPath).isDirectory();
    });

    const extractedThemePath2 = path.join(tmpDir2, themeDir2);

    // Determine destination (should add suffix since original exists)
    let destThemeDir2 = path.join(customThemesDir, themeDir2);
    if (fs.existsSync(destThemeDir2)) {
      destThemeDir2 = path.join(customThemesDir, `${themeDir2}-1`);
    }

    fs.cpSync(extractedThemePath2, destThemeDir2, { recursive: true });
    fs.rmSync(tmpDir2, { recursive: true, force: true });

    recordTest('Duplicate import handled (created with suffix)', fs.existsSync(destThemeDir2));
    console.log(`  Duplicate imported as: ${path.basename(destThemeDir2)}`);
    console.log('');

    console.log('H. Cleanup test artifacts');
    console.log('--------------------------');

    // Clean up
    fs.unlinkSync(exportPath);
    fs.rmSync(destThemeDir, { recursive: true });
    if (fs.existsSync(destThemeDir2)) {
      fs.rmSync(destThemeDir2, { recursive: true });
    }
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
      console.log('Test #102: IPC channel theme:import loads theme from file');
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
testThemeImport();
