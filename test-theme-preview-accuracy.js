#!/usr/bin/env node

/**
 * Test #147: Theme preview accurately reflects actual theme colors
 *
 * This test verifies that the colors shown in the theme preview modal
 * match the colors that will actually be used when the theme is applied
 * to terminals and editors.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('============================================================');
console.log('TEST #147: Theme Preview Color Accuracy');
console.log('============================================================\n');

const appSupportPath = path.join(
  os.homedir(),
  'Library/Application Support/MacTheme'
);

// Test with tokyo-night theme
const themePath = path.join(appSupportPath, 'themes/tokyo-night');
const themeJsonPath = path.join(themePath, 'theme.json');

console.log('Step 1: Load theme metadata (used by preview)...');
if (!fs.existsSync(themeJsonPath)) {
  console.error('❌ theme.json not found:', themeJsonPath);
  process.exit(1);
}

const themeJson = JSON.parse(fs.readFileSync(themeJsonPath, 'utf8'));
console.log('✓ Loaded theme.json for', themeJson.name);
console.log('  Colors in theme.json:', Object.keys(themeJson.colors).length, 'colors\n');

// Display key colors from theme.json
console.log('Colors from theme.json (shown in preview):');
console.log('  Background:', themeJson.colors.background);
console.log('  Foreground:', themeJson.colors.foreground);
console.log('  Red:', themeJson.colors.red);
console.log('  Green:', themeJson.colors.green);
console.log('  Blue:', themeJson.colors.blue);
console.log('  Yellow:', themeJson.colors.yellow);
console.log('  Cyan:', themeJson.colors.cyan);
console.log('  Magenta:', themeJson.colors.magenta);
console.log('');

// Test Alacritty config
console.log('Step 2: Verify Alacritty config uses same colors...');
const alacrittyPath = path.join(themePath, 'alacritty.toml');
if (!fs.existsSync(alacrittyPath)) {
  console.error('❌ alacritty.toml not found');
  process.exit(1);
}

const alacrittyConfig = fs.readFileSync(alacrittyPath, 'utf8');

// Extract colors from TOML (simple regex approach)
function extractTomlColor(config, colorName) {
  // Match patterns like: background = "#1a1b26"
  const regex = new RegExp(`${colorName}\\s*=\\s*["']([#0-9a-fA-F]+)["']`, 'i');
  const match = config.match(regex);
  return match ? match[1].toLowerCase() : null;
}

const alacrittyBg = extractTomlColor(alacrittyConfig, 'background');
const alacrittyFg = extractTomlColor(alacrittyConfig, 'foreground');
const alacrittyRed = extractTomlColor(alacrittyConfig, 'red');
const alacrittyGreen = extractTomlColor(alacrittyConfig, 'green');
const alacrittyBlue = extractTomlColor(alacrittyConfig, 'blue');

console.log('Colors from alacritty.toml:');
console.log('  Background:', alacrittyBg);
console.log('  Foreground:', alacrittyFg);
console.log('  Red:', alacrittyRed);
console.log('  Green:', alacrittyGreen);
console.log('  Blue:', alacrittyBlue);
console.log('');

// Compare colors
function compareColors(name, previewColor, actualColor) {
  if (!actualColor) {
    console.log(`  ⚠️  ${name}: Could not extract from config`);
    return false;
  }

  const preview = previewColor.toLowerCase();
  const actual = actualColor.toLowerCase();

  if (preview === actual) {
    console.log(`  ✓ ${name}: Match (${preview})`);
    return true;
  } else {
    console.log(`  ❌ ${name}: Mismatch!`);
    console.log(`     Preview: ${preview}`);
    console.log(`     Actual:  ${actual}`);
    return false;
  }
}

console.log('Step 3: Compare preview colors with actual config colors...');
let allMatch = true;
allMatch &= compareColors('Background', themeJson.colors.background, alacrittyBg);
allMatch &= compareColors('Foreground', themeJson.colors.foreground, alacrittyFg);
allMatch &= compareColors('Red', themeJson.colors.red, alacrittyRed);
allMatch &= compareColors('Green', themeJson.colors.green, alacrittyGreen);
allMatch &= compareColors('Blue', themeJson.colors.blue, alacrittyBlue);
console.log('');

// Test Kitty config
console.log('Step 4: Verify Kitty config uses same colors...');
const kittyPath = path.join(themePath, 'kitty.conf');
if (!fs.existsSync(kittyPath)) {
  console.error('❌ kitty.conf not found');
  process.exit(1);
}

const kittyConfig = fs.readFileSync(kittyPath, 'utf8');

function extractKittyColor(config, colorName) {
  // Match patterns like: background #1a1b26
  const regex = new RegExp(`^${colorName}\\s+([#0-9a-fA-F]+)`, 'im');
  const match = config.match(regex);
  return match ? match[1].toLowerCase() : null;
}

const kittyBg = extractKittyColor(kittyConfig, 'background');
const kittyFg = extractKittyColor(kittyConfig, 'foreground');
const kittyRed = extractKittyColor(kittyConfig, 'color1');
const kittyGreen = extractKittyColor(kittyConfig, 'color2');

console.log('Colors from kitty.conf:');
console.log('  Background:', kittyBg);
console.log('  Foreground:', kittyFg);
console.log('  Red (color1):', kittyRed);
console.log('  Green (color2):', kittyGreen);
console.log('');

console.log('Step 5: Compare with Kitty colors...');
allMatch &= compareColors('Background', themeJson.colors.background, kittyBg);
allMatch &= compareColors('Foreground', themeJson.colors.foreground, kittyFg);
allMatch &= compareColors('Red', themeJson.colors.red, kittyRed);
allMatch &= compareColors('Green', themeJson.colors.green, kittyGreen);
console.log('');

// Test VS Code config
console.log('Step 6: Verify VS Code config...');
const vscodePath = path.join(themePath, 'vscode.json');
if (!fs.existsSync(vscodePath)) {
  console.error('❌ vscode.json not found');
  process.exit(1);
}

try {
  const vscodeConfig = JSON.parse(fs.readFileSync(vscodePath, 'utf8'));
  console.log('✓ VS Code theme JSON is valid');

  // VS Code has different structure - just verify it's valid
  if (vscodeConfig.colors) {
    console.log('  Found colors object with', Object.keys(vscodeConfig.colors).length, 'colors');
  }
  if (vscodeConfig.tokenColors) {
    console.log('  Found tokenColors with', vscodeConfig.tokenColors.length, 'rules');
  }
} catch (err) {
  console.error('❌ VS Code theme JSON is invalid:', err.message);
  allMatch = false;
}
console.log('');

// Summary
console.log('============================================================');
console.log('SUMMARY');
console.log('============================================================');

if (allMatch) {
  console.log('✅ TEST PASSED');
  console.log('   Theme preview colors accurately reflect actual config colors');
  console.log('   All tested colors match between theme.json and config files');
  process.exit(0);
} else {
  console.log('❌ TEST FAILED');
  console.log('   Some colors in preview do not match actual configs');
  console.log('   Check mismatches above for details');
  process.exit(1);
}
