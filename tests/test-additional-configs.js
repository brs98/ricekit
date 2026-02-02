#!/usr/bin/env node

/**
 * Test script for validating additional generated config files
 * Tests #142-145: Bat, Delta, Zsh, and Raycast config validation
 */

const path = require('path');
const fs = require('fs');

// Get theme directories
const homeDir = require('os').homedir();
const themesDir = path.join(homeDir, 'Library', 'Application Support', 'Ricekit', 'themes');

let testResults = {
  bat: { passed: 0, failed: 0, errors: [] },
  delta: { passed: 0, failed: 0, errors: [] },
  zsh: { passed: 0, failed: 0, errors: [] },
  raycast: { passed: 0, failed: 0, errors: [] },
};

/**
 * Validate Bat config
 */
function validateBatConfig(configPath, themeName) {
  try {
    const content = fs.readFileSync(configPath, 'utf-8');

    // Check for comment header
    if (!content.includes('# Bat theme configuration')) {
      throw new Error('Missing comment header');
    }

    // Check for required settings
    const requiredSettings = [
      '--theme=',
      '--style=',
      '--color='
    ];

    for (const setting of requiredSettings) {
      if (!content.includes(setting)) {
        throw new Error(`Missing required setting: ${setting}`);
      }
    }

    // Validate theme name format
    if (!content.includes('--theme="Ricekit"') && !content.includes("--theme='Ricekit'")) {
      throw new Error('Theme name should be "Ricekit"');
    }

    // Validate style format
    if (!content.match(/--style="[^"]+"/)) {
      throw new Error('Invalid style format');
    }

    // Validate color setting
    if (!content.includes('--color=always')) {
      throw new Error('Color should be set to "always"');
    }

    testResults.bat.passed++;
    return { success: true, themeName };
  } catch (error) {
    testResults.bat.failed++;
    testResults.bat.errors.push({ themeName, error: error.message });
    return { success: false, themeName, error: error.message };
  }
}

/**
 * Validate Delta gitconfig
 */
function validateDeltaConfig(configPath, themeName) {
  try {
    const content = fs.readFileSync(configPath, 'utf-8');

    // Check for [delta] section header
    if (!content.includes('[delta]')) {
      throw new Error('Missing [delta] section header');
    }

    // Check for required settings
    const requiredSettings = [
      'syntax-theme',
      'line-numbers',
      'side-by-side',
      'plus-style',
      'minus-style',
      'file-style',
      'hunk-header-style'
    ];

    for (const setting of requiredSettings) {
      if (!content.includes(setting)) {
        throw new Error(`Missing required setting: ${setting}`);
      }
    }

    // Validate boolean settings
    if (!content.includes('line-numbers = true')) {
      throw new Error('line-numbers should be set to true');
    }

    // Validate color hex codes in styles
    const colorHexRegex = /#[0-9a-fA-F]{6}/;
    if (!colorHexRegex.test(content)) {
      throw new Error('Missing color hex codes in styles');
    }

    // Check that plus-style uses green color reference
    if (!content.match(/plus-style\s*=\s*"syntax\s+#[0-9a-fA-F]{6}"/)) {
      throw new Error('Invalid plus-style format');
    }

    // Check that minus-style uses red color reference
    if (!content.match(/minus-style\s*=\s*"syntax\s+#[0-9a-fA-F]{6}"/)) {
      throw new Error('Invalid minus-style format');
    }

    testResults.delta.passed++;
    return { success: true, themeName };
  } catch (error) {
    testResults.delta.failed++;
    testResults.delta.errors.push({ themeName, error: error.message });
    return { success: false, themeName, error: error.message };
  }
}

/**
 * Validate Zsh theme script
 */
function validateZshConfig(configPath, themeName) {
  try {
    const content = fs.readFileSync(configPath, 'utf-8');

    // Check for comment header
    if (!content.includes('# Zsh syntax highlighting colors')) {
      throw new Error('Missing comment header');
    }

    // Check for required ZSH_HIGHLIGHT_STYLES entries
    const requiredStyles = [
      'default',
      'unknown-token',
      'reserved-word',
      'alias',
      'builtin',
      'function',
      'command',
      'precommand',
      'commandseparator',
      'path',
      'globbing',
      'single-quoted-argument',
      'double-quoted-argument'
    ];

    for (const style of requiredStyles) {
      const pattern = new RegExp(`ZSH_HIGHLIGHT_STYLES\\[${style}\\]`);
      if (!pattern.test(content)) {
        throw new Error(`Missing required style: ${style}`);
      }
    }

    // Validate color format - should use fg=#XXXXXX
    const colorFormatRegex = /fg=#[0-9a-fA-F]{6}/;
    if (!colorFormatRegex.test(content)) {
      throw new Error('Missing or invalid color format (should be fg=#XXXXXX)');
    }

    // Validate syntax - check for proper quote usage
    if (!content.match(/ZSH_HIGHLIGHT_STYLES\[[^\]]+\]='fg=#[0-9a-fA-F]{6}'/)) {
      throw new Error('Invalid ZSH_HIGHLIGHT_STYLES syntax');
    }

    testResults.zsh.passed++;
    return { success: true, themeName };
  } catch (error) {
    testResults.zsh.failed++;
    testResults.zsh.errors.push({ themeName, error: error.message });
    return { success: false, themeName, error: error.message };
  }
}

/**
 * Validate Raycast JSON config
 */
function validateRaycastConfig(configPath, themeName) {
  try {
    const content = fs.readFileSync(configPath, 'utf-8');

    // Parse JSON
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      throw new Error(`Invalid JSON: ${parseError.message}`);
    }

    // Validate top-level structure
    if (!parsed.name) {
      throw new Error('Missing "name" field');
    }

    if (!parsed.author) {
      throw new Error('Missing "author" field');
    }

    if (!parsed.colors) {
      throw new Error('Missing "colors" object');
    }

    // Validate required color fields
    const requiredColors = ['background', 'text', 'selection', 'accent'];
    for (const colorField of requiredColors) {
      if (!parsed.colors[colorField]) {
        throw new Error(`Missing required color: ${colorField}`);
      }

      // Validate color format (hex code)
      const color = parsed.colors[colorField];
      if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
        throw new Error(`Invalid color format for ${colorField}: ${color} (should be #XXXXXX)`);
      }
    }

    // Validate name is a non-empty string
    if (typeof parsed.name !== 'string' || parsed.name.trim() === '') {
      throw new Error('Name must be a non-empty string');
    }

    // Validate author is a non-empty string
    if (typeof parsed.author !== 'string' || parsed.author.trim() === '') {
      throw new Error('Author must be a non-empty string');
    }

    testResults.raycast.passed++;
    return { success: true, themeName };
  } catch (error) {
    testResults.raycast.failed++;
    testResults.raycast.errors.push({ themeName, error: error.message });
    return { success: false, themeName, error: error.message };
  }
}

/**
 * Main test runner
 */
function runTests() {
  console.log('🔍 Additional Config Validation Tests (Tests #142-145)\n');
  console.log('Testing themes directory:', themesDir);
  console.log('');

  if (!fs.existsSync(themesDir)) {
    console.error('❌ Themes directory not found!');
    process.exit(1);
  }

  // Get all theme directories
  const themes = fs.readdirSync(themesDir).filter(name => {
    const themePath = path.join(themesDir, name);
    return fs.statSync(themePath).isDirectory() && !name.startsWith('.');
  });

  console.log(`Found ${themes.length} themes to validate\n`);

  let totalTests = 0;
  let passedTests = 0;

  // Test each theme
  for (const themeName of themes) {
    const themePath = path.join(themesDir, themeName);

    // Test Bat config
    const batPath = path.join(themePath, 'bat.conf');
    if (fs.existsSync(batPath)) {
      totalTests++;
      const result = validateBatConfig(batPath, themeName);
      if (result.success) passedTests++;
    }

    // Test Delta config
    const deltaPath = path.join(themePath, 'delta.gitconfig');
    if (fs.existsSync(deltaPath)) {
      totalTests++;
      const result = validateDeltaConfig(deltaPath, themeName);
      if (result.success) passedTests++;
    }

    // Test Zsh config
    const zshPath = path.join(themePath, 'zsh-theme.zsh');
    if (fs.existsSync(zshPath)) {
      totalTests++;
      const result = validateZshConfig(zshPath, themeName);
      if (result.success) passedTests++;
    }

    // Test Raycast config
    const raycastPath = path.join(themePath, 'raycast.json');
    if (fs.existsSync(raycastPath)) {
      totalTests++;
      const result = validateRaycastConfig(raycastPath, themeName);
      if (result.success) passedTests++;
    }
  }

  // Print results
  console.log('═══════════════════════════════════════════════════════');
  console.log('TEST RESULTS SUMMARY');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log(`Test #142: Bat Config Validation`);
  console.log(`  ✅ Passed: ${testResults.bat.passed}`);
  console.log(`  ❌ Failed: ${testResults.bat.failed}`);
  if (testResults.bat.errors.length > 0) {
    console.log('  Errors:');
    testResults.bat.errors.forEach(err => {
      console.log(`    - ${err.themeName}: ${err.error}`);
    });
  }
  console.log('');

  console.log(`Test #143: Delta Gitconfig Validation`);
  console.log(`  ✅ Passed: ${testResults.delta.passed}`);
  console.log(`  ❌ Failed: ${testResults.delta.failed}`);
  if (testResults.delta.errors.length > 0) {
    console.log('  Errors:');
    testResults.delta.errors.forEach(err => {
      console.log(`    - ${err.themeName}: ${err.error}`);
    });
  }
  console.log('');

  console.log(`Test #144: Zsh Theme Script Validation`);
  console.log(`  ✅ Passed: ${testResults.zsh.passed}`);
  console.log(`  ❌ Failed: ${testResults.zsh.failed}`);
  if (testResults.zsh.errors.length > 0) {
    console.log('  Errors:');
    testResults.zsh.errors.forEach(err => {
      console.log(`    - ${err.themeName}: ${err.error}`);
    });
  }
  console.log('');

  console.log(`Test #145: Raycast JSON Validation`);
  console.log(`  ✅ Passed: ${testResults.raycast.passed}`);
  console.log(`  ❌ Failed: ${testResults.raycast.failed}`);
  if (testResults.raycast.errors.length > 0) {
    console.log('  Errors:');
    testResults.raycast.errors.forEach(err => {
      console.log(`    - ${err.themeName}: ${err.error}`);
    });
  }
  console.log('');

  console.log('═══════════════════════════════════════════════════════');
  console.log(`Total: ${passedTests}/${totalTests} configs validated successfully`);
  console.log(`Success Rate: ${totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0}%`);
  console.log('═══════════════════════════════════════════════════════\n');

  // Determine overall result
  const allTestsPassed = (
    testResults.bat.failed === 0 &&
    testResults.delta.failed === 0 &&
    testResults.zsh.failed === 0 &&
    testResults.raycast.failed === 0 &&
    testResults.bat.passed > 0 &&
    testResults.delta.passed > 0 &&
    testResults.zsh.passed > 0 &&
    testResults.raycast.passed > 0
  );

  if (allTestsPassed) {
    console.log('🎉 ALL TESTS PASSED!\n');
    console.log('Tests #142-145 are now verified and can be marked as passing.\n');
    return 0;
  } else {
    console.log('❌ SOME TESTS FAILED\n');
    console.log('Please review the errors above and fix the config generators.\n');
    return 1;
  }
}

// Run tests
const exitCode = runTests();
process.exit(exitCode);
