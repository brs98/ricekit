#!/usr/bin/env node

/**
 * Test script for validating generated config files
 * Tests #137-141: Config generation produces valid files
 */

const path = require('path');
const fs = require('fs');
const toml = require('@iarna/toml');
const yaml = require('js-yaml');

// Get theme directories
const homeDir = require('os').homedir();
const themesDir = path.join(homeDir, 'Library', 'Application Support', 'Ricekit', 'custom-themes');

let testResults = {
  alacritty: { passed: 0, failed: 0, errors: [] },
  kitty: { passed: 0, failed: 0, errors: [] },
  warp: { passed: 0, failed: 0, errors: [] },
  hyper: { passed: 0, failed: 0, errors: [] },
  starship: { passed: 0, failed: 0, errors: [] },
};

/**
 * Validate Alacritty TOML config
 */
function validateAlacrittyConfig(configPath, themeName) {
  try {
    const content = fs.readFileSync(configPath, 'utf-8');

    // Parse TOML
    const parsed = toml.parse(content);

    // Validate structure
    if (!parsed.colors) {
      throw new Error('Missing [colors] section');
    }

    if (!parsed.colors.primary) {
      throw new Error('Missing [colors.primary] section');
    }

    if (!parsed.colors.primary.background || !parsed.colors.primary.foreground) {
      throw new Error('Missing required primary colors (background/foreground)');
    }

    if (!parsed.colors.normal) {
      throw new Error('Missing [colors.normal] section');
    }

    if (!parsed.colors.bright) {
      throw new Error('Missing [colors.bright] section');
    }

    // Check all required normal colors
    const requiredNormalColors = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
    for (const color of requiredNormalColors) {
      if (!parsed.colors.normal[color]) {
        throw new Error(`Missing normal.${color} color`);
      }
    }

    // Check all required bright colors
    for (const color of requiredNormalColors) {
      if (!parsed.colors.bright[color]) {
        throw new Error(`Missing bright.${color} color`);
      }
    }

    testResults.alacritty.passed++;
    return { success: true, themeName };
  } catch (error) {
    testResults.alacritty.failed++;
    testResults.alacritty.errors.push({ themeName, error: error.message });
    return { success: false, themeName, error: error.message };
  }
}

/**
 * Validate Kitty config
 */
function validateKittyConfig(configPath, themeName) {
  try {
    const content = fs.readFileSync(configPath, 'utf-8');

    // Check for required settings
    const requiredSettings = [
      'background',
      'foreground',
      'cursor',
      'selection_background',
      'selection_foreground'
    ];

    for (const setting of requiredSettings) {
      if (!content.includes(setting)) {
        throw new Error(`Missing required setting: ${setting}`);
      }
    }

    // Check for ANSI colors (color0 through color15)
    for (let i = 0; i <= 15; i++) {
      if (!content.includes(`color${i}`)) {
        throw new Error(`Missing color${i}`);
      }
    }

    // Validate color format (should be hex colors)
    const lines = content.split('\n').filter(line => !line.startsWith('#') && line.trim());
    for (const line of lines) {
      const parts = line.split(/\s+/);
      if (parts.length >= 2) {
        const colorValue = parts[parts.length - 1];
        // Should be hex color
        if (!/^#[0-9a-fA-F]{6}$/.test(colorValue)) {
          throw new Error(`Invalid color format in line: ${line}`);
        }
      }
    }

    testResults.kitty.passed++;
    return { success: true, themeName };
  } catch (error) {
    testResults.kitty.failed++;
    testResults.kitty.errors.push({ themeName, error: error.message });
    return { success: false, themeName, error: error.message };
  }
}

/**
 * Validate Warp YAML config
 */
function validateWarpConfig(configPath, themeName) {
  try {
    const content = fs.readFileSync(configPath, 'utf-8');

    // Parse YAML
    const parsed = yaml.load(content);

    // Validate structure
    if (!parsed.background) {
      throw new Error('Missing background property');
    }

    if (!parsed.foreground) {
      throw new Error('Missing foreground property');
    }

    if (!parsed.terminal_colors) {
      throw new Error('Missing terminal_colors property');
    }

    if (!parsed.terminal_colors.normal) {
      throw new Error('Missing terminal_colors.normal section');
    }

    if (!parsed.terminal_colors.bright) {
      throw new Error('Missing terminal_colors.bright section');
    }

    // Check required colors
    const requiredColors = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
    for (const color of requiredColors) {
      if (!parsed.terminal_colors.normal[color]) {
        throw new Error(`Missing terminal_colors.normal.${color}`);
      }
      if (!parsed.terminal_colors.bright[color]) {
        throw new Error(`Missing terminal_colors.bright.${color}`);
      }
    }

    testResults.warp.passed++;
    return { success: true, themeName };
  } catch (error) {
    testResults.warp.failed++;
    testResults.warp.errors.push({ themeName, error: error.message });
    return { success: false, themeName, error: error.message };
  }
}

/**
 * Validate Hyper.js config
 */
function validateHyperConfig(configPath, themeName) {
  try {
    const content = fs.readFileSync(configPath, 'utf-8');

    // Check if it's valid JavaScript by trying to evaluate it
    // Use a safer approach - check for module.exports and basic structure
    if (!content.includes('module.exports')) {
      throw new Error('Missing module.exports statement');
    }

    // Check for required properties
    const requiredProps = [
      'backgroundColor',
      'foregroundColor',
      'cursorColor',
      'selectionColor',
      'colors'
    ];

    for (const prop of requiredProps) {
      if (!content.includes(prop)) {
        throw new Error(`Missing required property: ${prop}`);
      }
    }

    // Check for all color properties in colors object
    const requiredColorProps = [
      'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
      'lightBlack', 'lightRed', 'lightGreen', 'lightYellow', 'lightBlue', 'lightMagenta', 'lightCyan', 'lightWhite'
    ];

    for (const colorProp of requiredColorProps) {
      if (!content.includes(`${colorProp}:`)) {
        throw new Error(`Missing color property: ${colorProp}`);
      }
    }

    // Try to evaluate it (in a limited way)
    try {
      // Replace module.exports with a variable assignment for testing
      const testCode = content.replace('module.exports', 'const config');
      eval(testCode); // This is safe because we generated the content
    } catch (evalError) {
      throw new Error(`JavaScript syntax error: ${evalError.message}`);
    }

    testResults.hyper.passed++;
    return { success: true, themeName };
  } catch (error) {
    testResults.hyper.failed++;
    testResults.hyper.errors.push({ themeName, error: error.message });
    return { success: false, themeName, error: error.message };
  }
}

/**
 * Validate Starship TOML config
 */
function validateStarshipConfig(configPath, themeName) {
  try {
    const content = fs.readFileSync(configPath, 'utf-8');

    // Parse TOML
    const parsed = toml.parse(content);

    // Validate structure - Starship should have format and sections
    if (!parsed.format) {
      throw new Error('Missing format property');
    }

    // Check for common Starship sections
    const commonSections = ['directory', 'git_branch', 'git_status'];
    let hasAtLeastOne = false;
    for (const section of commonSections) {
      if (parsed[section]) {
        hasAtLeastOne = true;
        break;
      }
    }

    if (!hasAtLeastOne) {
      throw new Error('Missing common Starship sections (directory, git_branch, git_status)');
    }

    // Validate that style properties exist if sections exist
    if (parsed.directory && !parsed.directory.style) {
      throw new Error('[directory] section missing style property');
    }

    testResults.starship.passed++;
    return { success: true, themeName };
  } catch (error) {
    testResults.starship.failed++;
    testResults.starship.errors.push({ themeName, error: error.message });
    return { success: false, themeName, error: error.message };
  }
}

/**
 * Test all config files in a theme directory
 */
function testThemeConfigs(themeDir, themeName) {
  console.log(`\n  Testing theme: ${themeName}`);

  const configs = [
    { name: 'Alacritty', file: 'alacritty.toml', validator: validateAlacrittyConfig },
    { name: 'Kitty', file: 'kitty.conf', validator: validateKittyConfig },
    { name: 'Warp', file: 'warp.yaml', validator: validateWarpConfig },
    { name: 'Hyper', file: 'hyper.js', validator: validateHyperConfig },
    { name: 'Starship', file: 'starship.toml', validator: validateStarshipConfig },
  ];

  for (const config of configs) {
    const configPath = path.join(themeDir, config.file);
    if (fs.existsSync(configPath)) {
      const result = config.validator(configPath, themeName);
      if (result.success) {
        console.log(`    ✓ ${config.name} config is valid`);
      } else {
        console.log(`    ✗ ${config.name} config is invalid: ${result.error}`);
      }
    } else {
      console.log(`    ⚠ ${config.name} config not found`);
    }
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('='.repeat(80));
  console.log('CONFIG VALIDATION TEST - Tests #137-141');
  console.log('='.repeat(80));

  // Test bundled themes first
  const bundledThemesDir = path.join(homeDir, 'Library', 'Application Support', 'Ricekit', 'themes');

  console.log('\n📦 Testing bundled themes:');
  if (fs.existsSync(bundledThemesDir)) {
    const themes = fs.readdirSync(bundledThemesDir);
    for (const themeName of themes) {
      const themeDir = path.join(bundledThemesDir, themeName);
      if (fs.statSync(themeDir).isDirectory()) {
        testThemeConfigs(themeDir, themeName);
      }
    }
  } else {
    console.log('  ⚠ Bundled themes directory not found');
  }

  // Test custom themes
  console.log('\n🎨 Testing custom themes:');
  if (fs.existsSync(themesDir)) {
    const themes = fs.readdirSync(themesDir);
    if (themes.length === 0) {
      console.log('  ℹ No custom themes found');
    } else {
      for (const themeName of themes) {
        const themeDir = path.join(themesDir, themeName);
        if (fs.statSync(themeDir).isDirectory()) {
          testThemeConfigs(themeDir, themeName);
        }
      }
    }
  } else {
    console.log('  ⚠ Custom themes directory not found');
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));

  const configs = [
    { name: 'Test #137: Alacritty TOML', key: 'alacritty' },
    { name: 'Test #138: Kitty Config', key: 'kitty' },
    { name: 'Test #139: Warp YAML', key: 'warp' },
    { name: 'Test #140: Hyper.js', key: 'hyper' },
    { name: 'Test #141: Starship TOML', key: 'starship' },
  ];

  let allPassed = true;

  for (const config of configs) {
    const results = testResults[config.key];
    const total = results.passed + results.failed;
    const status = results.failed === 0 ? '✅ PASS' : '❌ FAIL';

    console.log(`\n${config.name}: ${status}`);
    console.log(`  Passed: ${results.passed}/${total}`);
    console.log(`  Failed: ${results.failed}/${total}`);

    if (results.errors.length > 0) {
      allPassed = false;
      console.log('  Errors:');
      for (const error of results.errors) {
        console.log(`    - ${error.themeName}: ${error.error}`);
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  if (allPassed) {
    console.log('✅ ALL CONFIG VALIDATION TESTS PASSED');
    console.log('All generated config files are valid and properly structured.');
  } else {
    console.log('❌ SOME CONFIG VALIDATION TESTS FAILED');
    console.log('Review errors above and fix config generation functions.');
  }
  console.log('='.repeat(80));

  return allPassed;
}

// Run tests
(async () => {
  try {
    const allPassed = await runTests();
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('Test error:', error);
    process.exit(1);
  }
})();
