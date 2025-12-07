const fs = require('fs');
const path = require('path');
const os = require('os');

// Simple verification test - check core functionality
async function verifyCore() {
  console.log('\n=== Session 31 Verification Test ===\n');

  try {
    // Test 1: Verify directory structure
    const macThemeDir = path.join(os.homedir(), 'Library', 'Application Support', 'MacTheme');
    const themesDir = path.join(macThemeDir, 'themes');
    const customThemesDir = path.join(macThemeDir, 'custom-themes');
    const currentDir = path.join(macThemeDir, 'current');

    console.log('✓ Checking directory structure...');
    if (!fs.existsSync(themesDir)) throw new Error('themes directory missing');
    if (!fs.existsSync(customThemesDir)) throw new Error('custom-themes directory missing');
    if (!fs.existsSync(currentDir)) throw new Error('current directory missing');
    console.log('  ✓ All directories exist\n');

    // Test 2: Check bundled themes
    console.log('✓ Checking bundled themes...');
    const themes = fs.readdirSync(themesDir).filter(f => {
      const stat = fs.statSync(path.join(themesDir, f));
      return stat.isDirectory() && !f.startsWith('.');
    });
    console.log(`  ✓ Found ${themes.length} bundled themes: ${themes.join(', ')}\n`);

    if (themes.length < 11) {
      throw new Error(`Expected 11 bundled themes, found ${themes.length}`);
    }

    // Test 3: Check state.json
    console.log('✓ Checking state.json...');
    const stateFile = path.join(macThemeDir, 'state.json');
    if (!fs.existsSync(stateFile)) throw new Error('state.json missing');
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
    console.log(`  ✓ Current theme: ${state.currentTheme}\n`);

    // Test 4: Check symlink
    console.log('✓ Checking current theme symlink...');
    const symlinkPath = path.join(currentDir, 'theme');
    if (!fs.existsSync(symlinkPath)) throw new Error('theme symlink missing');
    const linkTarget = fs.readlinkSync(symlinkPath);
    console.log(`  ✓ Symlink points to: ${linkTarget}\n`);

    // Test 5: Check theme.json in current theme
    console.log('✓ Checking current theme files...');
    const currentThemeJson = path.join(symlinkPath, 'theme.json');
    if (!fs.existsSync(currentThemeJson)) throw new Error('theme.json missing in current theme');
    const themeData = JSON.parse(fs.readFileSync(currentThemeJson, 'utf-8'));
    console.log(`  ✓ Theme name: ${themeData.name}`);
    console.log(`  ✓ Author: ${themeData.author}`);
    console.log(`  ✓ Colors defined: ${Object.keys(themeData.colors).length}\n`);

    console.log('=== ✓ ALL VERIFICATION CHECKS PASSED ===\n');
    console.log('No regressions detected. System is healthy.\n');

  } catch (error) {
    console.error('\n=== ✗ VERIFICATION FAILED ===');
    console.error('Error:', error.message);
    console.error('\nBUG DETECTED! Fix before continuing.\n');
    process.exit(1);
  }
}

verifyCore();
