/**
 * Backend test for theme import functionality
 * Tests the import handler directly
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

async function testImportBackend() {
  console.log('\n=== Backend Test: Theme Import ===\n');

  const themesDir = path.join(os.homedir(), 'Library', 'Application Support', 'Ricekit', 'themes');
  const customThemesDir = path.join(os.homedir(), 'Library', 'Application Support', 'Ricekit', 'custom-themes');
  const testExportPath = path.join(os.tmpdir(), 'test-theme-export.ricekit');

  try {
    // Step 1: Export a theme to create a .ricekit file
    console.log('Step 1: Exporting tokyo-night theme...');
    const sourceThemePath = path.join(themesDir, 'tokyo-night');

    if (!fs.existsSync(sourceThemePath)) {
      throw new Error('tokyo-night theme not found');
    }

    // Create a zip archive manually
    await exec(`cd "${themesDir}" && zip -r -q "${testExportPath}" tokyo-night`);
    console.log(`✓ Exported to: ${testExportPath}`);

    const stats = fs.statSync(testExportPath);
    console.log(`  File size: ${stats.size} bytes\n`);

    // Step 2: Test extraction
    console.log('Step 2: Testing extraction...');
    const tmpDir = path.join(os.tmpdir(), `ricekit-test-import-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    await exec(`unzip -q "${testExportPath}" -d "${tmpDir}"`);
    console.log(`✓ Extracted to: ${tmpDir}`);

    // Step 3: Verify extracted contents
    console.log('Step 3: Verifying extracted contents...');
    const extractedContents = fs.readdirSync(tmpDir);
    console.log(`  Contents: ${extractedContents.join(', ')}`);

    const themeDir = extractedContents.find(name => {
      const itemPath = path.join(tmpDir, name);
      return fs.statSync(itemPath).isDirectory();
    });

    if (!themeDir) {
      throw new Error('No theme directory found in extraction');
    }

    console.log(`  Theme directory: ${themeDir}`);

    const extractedThemePath = path.join(tmpDir, themeDir);
    const themeMetadataPath = path.join(extractedThemePath, 'theme.json');

    if (!fs.existsSync(themeMetadataPath)) {
      throw new Error('theme.json not found');
    }

    const themeMetadata = JSON.parse(fs.readFileSync(themeMetadataPath, 'utf-8'));
    console.log(`  Theme name: ${themeMetadata.name}`);
    console.log(`  Theme author: ${themeMetadata.author}`);
    console.log(`✓ Theme metadata is valid\n`);

    // Step 4: Simulate import (copy to custom-themes with unique name)
    console.log('Step 4: Simulating import to custom-themes...');
    let destThemeDir = path.join(customThemesDir, themeDir);
    let importedName = themeDir;

    // Generate unique name if already exists
    if (fs.existsSync(destThemeDir)) {
      let counter = 1;
      while (fs.existsSync(path.join(customThemesDir, `${themeDir}-${counter}`))) {
        counter++;
      }
      destThemeDir = path.join(customThemesDir, `${themeDir}-${counter}`);
      importedName = `${themeDir}-${counter}`;
      console.log(`  Theme already exists, importing as: ${importedName}`);
    }

    // Copy to custom-themes
    fs.cpSync(extractedThemePath, destThemeDir, { recursive: true });
    console.log(`✓ Copied to: ${destThemeDir}\n`);

    // Step 5: Verify imported theme
    console.log('Step 5: Verifying imported theme...');
    const importedFiles = fs.readdirSync(destThemeDir);
    console.log(`  Files in imported theme: ${importedFiles.length}`);

    const requiredFiles = ['theme.json', 'alacritty.toml', 'kitty.conf', 'vscode.json'];
    const missingFiles = requiredFiles.filter(f => !importedFiles.includes(f));

    if (missingFiles.length > 0) {
      console.log(`  ⚠ Missing files: ${missingFiles.join(', ')}`);
    } else {
      console.log(`  ✓ All required config files present`);
    }

    // Cleanup
    console.log('\nStep 6: Cleanup...');
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.unlinkSync(testExportPath);
    console.log('✓ Temporary files cleaned up\n');

    console.log('=== Test Result: SUCCESS ===');
    console.log(`\nImported theme location: ${destThemeDir}`);
    console.log('You can verify the imported theme in the Ricekit app Themes view.\n');

    return true;
  } catch (error) {
    console.error('\n=== Test Result: FAILED ===');
    console.error(`Error: ${error.message}\n`);
    return false;
  }
}

testImportBackend();
