#!/usr/bin/env node

/**
 * Simple verification test to ensure theme system is working
 * Tests that we can list themes and check current state
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

function log(message) {
  console.log(`[TEST] ${message}`);
}

function testThemeDirectories() {
  log('Testing theme directory structure...');

  const homeDir = os.homedir();
  const macThemeDir = path.join(homeDir, 'Library', 'Application Support', 'MacTheme');
  const themesDir = path.join(macThemeDir, 'themes');
  const customThemesDir = path.join(macThemeDir, 'custom-themes');
  const currentDir = path.join(macThemeDir, 'current');

  // Check directories exist
  if (!fs.existsSync(macThemeDir)) {
    log('✗ FAIL: MacTheme directory does not exist');
    return false;
  }
  log('✓ MacTheme directory exists');

  if (!fs.existsSync(themesDir)) {
    log('✗ FAIL: themes directory does not exist');
    return false;
  }
  log('✓ themes directory exists');

  if (!fs.existsSync(customThemesDir)) {
    log('✗ FAIL: custom-themes directory does not exist');
    return false;
  }
  log('✓ custom-themes directory exists');

  if (!fs.existsSync(currentDir)) {
    log('✗ FAIL: current directory does not exist');
    return false;
  }
  log('✓ current directory exists');

  // Check for bundled themes
  const themes = fs.readdirSync(themesDir);
  log(`✓ Found ${themes.length} bundled themes: ${themes.slice(0, 3).join(', ')}...`);

  if (themes.length < 10) {
    log('✗ FAIL: Expected at least 10 bundled themes');
    return false;
  }

  // Check state.json
  const statePath = path.join(macThemeDir, 'state.json');
  if (!fs.existsSync(statePath)) {
    log('✗ FAIL: state.json does not exist');
    return false;
  }

  const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  log(`✓ state.json exists, current theme: ${state.currentTheme}`);

  // Check symlink
  const symlinkPath = path.join(currentDir, 'theme');
  if (!fs.existsSync(symlinkPath)) {
    log('✗ FAIL: theme symlink does not exist');
    return false;
  }

  const stats = fs.lstatSync(symlinkPath);
  if (!stats.isSymbolicLink()) {
    log('✗ FAIL: theme path is not a symlink');
    return false;
  }

  const linkTarget = fs.readlinkSync(symlinkPath);
  log(`✓ theme symlink exists and points to: ${path.basename(linkTarget)}`);

  // Check preferences.json
  const prefsPath = path.join(macThemeDir, 'preferences.json');
  if (!fs.existsSync(prefsPath)) {
    log('✗ FAIL: preferences.json does not exist');
    return false;
  }

  const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf-8'));
  log(`✓ preferences.json exists`);

  return true;
}

function testThemeFiles() {
  log('\nTesting theme file structure...');

  const homeDir = os.homedir();
  const themesDir = path.join(homeDir, 'Library', 'Application Support', 'MacTheme', 'themes');
  const tokyoNightDir = path.join(themesDir, 'tokyo-night');

  if (!fs.existsSync(tokyoNightDir)) {
    log('✗ FAIL: tokyo-night theme not found');
    return false;
  }
  log('✓ tokyo-night theme directory exists');

  // Check for required files
  const requiredFiles = [
    'theme.json',
    'alacritty.toml',
    'kitty.conf',
    'iterm2.itermcolors',
    'warp.yaml',
    'hyper.js',
    'vscode.json',
    'neovim.lua',
    'raycast.json',
    'bat.conf',
    'delta.gitconfig',
    'starship.toml',
    'zsh-theme.zsh'
  ];

  let allFilesExist = true;
  for (const file of requiredFiles) {
    const filePath = path.join(tokyoNightDir, file);
    if (!fs.existsSync(filePath)) {
      log(`✗ FAIL: ${file} not found`);
      allFilesExist = false;
    }
  }

  if (allFilesExist) {
    log(`✓ All ${requiredFiles.length} required config files exist`);
  }

  // Check theme.json structure
  const themeJson = JSON.parse(fs.readFileSync(path.join(tokyoNightDir, 'theme.json'), 'utf-8'));
  if (!themeJson.name || !themeJson.colors || !themeJson.author) {
    log('✗ FAIL: theme.json missing required fields');
    return false;
  }
  log(`✓ theme.json is valid: ${themeJson.name} by ${themeJson.author}`);

  return allFilesExist;
}

// Run all tests
log('========================================');
log('VERIFICATION TEST - Theme System');
log('========================================\n');

const test1 = testThemeDirectories();
const test2 = testThemeFiles();

log('\n========================================');
if (test1 && test2) {
  log('✓ ALL VERIFICATION TESTS PASSED');
  log('========================================');
  process.exit(0);
} else {
  log('✗ SOME VERIFICATION TESTS FAILED');
  log('========================================');
  process.exit(1);
}
