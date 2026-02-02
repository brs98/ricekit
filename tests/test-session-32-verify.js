#!/usr/bin/env node

/**
 * Session 32 - System Health Verification
 *
 * Verifies that previously passing tests still work before implementing new features.
 * Tests core functionality: theme listing and theme application.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('='.repeat(60));
console.log('SESSION 32 - SYSTEM HEALTH VERIFICATION');
console.log('='.repeat(60));
console.log('');

// Test configuration
const APP_SUPPORT = path.join(process.env.HOME, 'Library/Application Support/Ricekit');
const THEMES_DIR = path.join(APP_SUPPORT, 'themes');
const CURRENT_DIR = path.join(APP_SUPPORT, 'current');
const THEME_SYMLINK = path.join(CURRENT_DIR, 'theme');

let passedTests = 0;
let totalTests = 0;

function test(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`   ✓ ${description}`);
    passedTests++;
    return true;
  } catch (error) {
    console.log(`   ✗ ${description}`);
    console.log(`     Error: ${error.message}`);
    return false;
  }
}

console.log('VERIFICATION TEST 1: Theme Directory Structure');
console.log('-'.repeat(60));

test('Ricekit directory exists', () => {
  if (!fs.existsSync(APP_SUPPORT)) {
    throw new Error(`Directory not found: ${APP_SUPPORT}`);
  }
});

test('Themes directory exists', () => {
  if (!fs.existsSync(THEMES_DIR)) {
    throw new Error(`Directory not found: ${THEMES_DIR}`);
  }
});

test('Current directory exists', () => {
  if (!fs.existsSync(CURRENT_DIR)) {
    throw new Error(`Directory not found: ${CURRENT_DIR}`);
  }
});

test('At least 11 bundled themes installed', () => {
  const themes = fs.readdirSync(THEMES_DIR).filter(name => {
    const themePath = path.join(THEMES_DIR, name);
    return fs.statSync(themePath).isDirectory();
  });

  if (themes.length < 11) {
    throw new Error(`Expected at least 11 themes, found ${themes.length}`);
  }
});

console.log('');
console.log('VERIFICATION TEST 2: Theme Symlink Management');
console.log('-'.repeat(60));

test('Theme symlink exists', () => {
  if (!fs.existsSync(THEME_SYMLINK)) {
    throw new Error('Theme symlink does not exist');
  }
});

test('Theme symlink is a symbolic link', () => {
  const stats = fs.lstatSync(THEME_SYMLINK);
  if (!stats.isSymbolicLink()) {
    throw new Error('Theme path exists but is not a symlink');
  }
});

test('Theme symlink points to valid theme', () => {
  const target = fs.readlinkSync(THEME_SYMLINK);
  const resolvedPath = path.resolve(CURRENT_DIR, target);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Symlink points to non-existent path: ${target}`);
  }

  const themeJson = path.join(resolvedPath, 'theme.json');
  if (!fs.existsSync(themeJson)) {
    throw new Error('Target directory missing theme.json');
  }
});

console.log('');
console.log('VERIFICATION TEST 3: Theme Configuration Files');
console.log('-'.repeat(60));

const target = fs.readlinkSync(THEME_SYMLINK);
const themePath = path.resolve(CURRENT_DIR, target);

const requiredFiles = [
  'theme.json',
  'alacritty.toml',
  'kitty.conf',
  'iterm2.itermcolors',
  'warp.yaml',
  'hyper.js',
  'vscode.json',
  'neovim.lua'
];

requiredFiles.forEach(file => {
  test(`${file} exists in current theme`, () => {
    const filePath = path.join(themePath, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${file}`);
    }
  });
});

console.log('');
console.log('='.repeat(60));
console.log('VERIFICATION RESULTS');
console.log('='.repeat(60));
console.log(`Tests Passed: ${passedTests}/${totalTests}`);
console.log('');

if (passedTests === totalTests) {
  console.log('✅ ALL VERIFICATION TESTS PASSED');
  console.log('✅ System is healthy - safe to proceed with new features');
  console.log('');
  process.exit(0);
} else {
  console.log('❌ VERIFICATION FAILURES DETECTED');
  console.log('⚠️  DO NOT implement new features until issues are resolved');
  console.log('');
  process.exit(1);
}
