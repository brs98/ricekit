#!/usr/bin/env node

/**
 * Basic verification test - checks if themes are loaded
 * This tests the core theme loading functionality
 */

const fs = require('fs');
const path = require('path');

const MACTHEME_DIR = path.join(require('os').homedir(), 'Library/Application Support/Ricekit');
const THEMES_DIR = path.join(MACTHEME_DIR, 'themes');
const CURRENT_DIR = path.join(MACTHEME_DIR, 'current');

console.log('🔍 Ricekit Basic Verification Test\n');

// Test 1: Check themes directory exists
console.log('Test 1: Themes directory exists');
if (fs.existsSync(THEMES_DIR)) {
  console.log('✅ PASS: Themes directory found\n');
} else {
  console.log('❌ FAIL: Themes directory not found\n');
  process.exit(1);
}

// Test 2: Count installed themes
console.log('Test 2: Bundled themes installed');
const themes = fs.readdirSync(THEMES_DIR).filter(f => {
  const stat = fs.statSync(path.join(THEMES_DIR, f));
  return stat.isDirectory() && !f.startsWith('.');
});

console.log(`   Found ${themes.length} themes:`);
themes.forEach(t => console.log(`   - ${t}`));

if (themes.length >= 11) {
  console.log('✅ PASS: All 11+ bundled themes installed\n');
} else {
  console.log(`❌ FAIL: Expected 11+ themes, found ${themes.length}\n`);
  process.exit(1);
}

// Test 3: Check current symlink
console.log('Test 3: Current theme symlink');
const themeLinkPath = path.join(CURRENT_DIR, 'theme');
if (fs.existsSync(themeLinkPath)) {
  const stats = fs.lstatSync(themeLinkPath);
  if (stats.isSymbolicLink()) {
    const target = fs.readlinkSync(themeLinkPath);
    console.log(`   Symlink points to: ${target}`);
    console.log('✅ PASS: Current theme symlink exists\n');
  } else {
    console.log('❌ FAIL: theme is not a symlink\n');
    process.exit(1);
  }
} else {
  console.log('❌ FAIL: Current theme symlink not found\n');
  process.exit(1);
}

// Test 4: Verify theme has required files
console.log('Test 4: Theme structure validation');
const currentTheme = fs.readlinkSync(themeLinkPath);
const themeJsonPath = path.join(currentTheme, 'theme.json');

if (fs.existsSync(themeJsonPath)) {
  const themeData = JSON.parse(fs.readFileSync(themeJsonPath, 'utf8'));
  console.log(`   Theme: ${themeData.name}`);
  console.log(`   Author: ${themeData.author}`);

  const requiredFiles = [
    'alacritty.toml',
    'kitty.conf',
    'theme.json'
  ];

  let allFilesExist = true;
  for (const file of requiredFiles) {
    const filePath = path.join(currentTheme, file);
    if (!fs.existsSync(filePath)) {
      console.log(`   ❌ Missing: ${file}`);
      allFilesExist = false;
    }
  }

  if (allFilesExist) {
    console.log('✅ PASS: Theme has required configuration files\n');
  } else {
    console.log('❌ FAIL: Theme missing required files\n');
    process.exit(1);
  }
} else {
  console.log('❌ FAIL: theme.json not found in current theme\n');
  process.exit(1);
}

console.log('🎉 All verification tests passed!\n');
console.log('The app is in a good state. Ready for new feature implementation.\n');
