#!/usr/bin/env node

/**
 * Test script for validating light.mode marker file
 * Test #146: Light mode themes have light.mode marker file
 */

const path = require('path');
const fs = require('fs');

// Get theme directories
const homeDir = require('os').homedir();
const themesDir = path.join(homeDir, 'Library', 'Application Support', 'MacTheme', 'themes');

console.log('🔍 Light Mode Marker File Test (Test #146)\n');
console.log('Testing themes directory:', themesDir);
console.log('');

if (!fs.existsSync(themesDir)) {
  console.error('❌ Themes directory not found!');
  process.exit(1);
}

// Known light themes
const lightThemes = [
  'catppuccin-latte',
  'gruvbox-light',
  'solarized-light'
];

// Known dark themes (should NOT have light.mode)
const darkThemes = [
  'tokyo-night',
  'catppuccin-mocha',
  'dracula',
  'gruvbox-dark',
  'nord',
  'one-dark',
  'rose-pine',
  'solarized-dark'
];

let allPassed = true;

console.log('═══════════════════════════════════════════════════════');
console.log('STEP 1: Verify light themes have light.mode marker');
console.log('═══════════════════════════════════════════════════════\n');

for (const themeName of lightThemes) {
  const themePath = path.join(themesDir, themeName);
  const markerPath = path.join(themePath, 'light.mode');

  if (!fs.existsSync(themePath)) {
    console.log(`⚠️  ${themeName}: Theme directory not found`);
    allPassed = false;
    continue;
  }

  if (fs.existsSync(markerPath)) {
    console.log(`✅ ${themeName}: light.mode file exists`);

    // Verify it's a file (not directory)
    const stats = fs.statSync(markerPath);
    if (stats.isFile()) {
      // Check that it's empty or very small (marker file)
      const size = stats.size;
      if (size <= 10) {
        console.log(`   File size: ${size} bytes (correct - marker file should be empty)`);
      } else {
        console.log(`   ⚠️  File size: ${size} bytes (unusual for a marker file)`);
      }
    } else {
      console.log(`   ❌ ERROR: light.mode is not a file!`);
      allPassed = false;
    }
  } else {
    console.log(`❌ ${themeName}: light.mode file MISSING`);
    allPassed = false;
  }
  console.log('');
}

console.log('═══════════════════════════════════════════════════════');
console.log('STEP 2: Verify dark themes do NOT have light.mode marker');
console.log('═══════════════════════════════════════════════════════\n');

for (const themeName of darkThemes) {
  const themePath = path.join(themesDir, themeName);
  const markerPath = path.join(themePath, 'light.mode');

  if (!fs.existsSync(themePath)) {
    console.log(`⚠️  ${themeName}: Theme directory not found`);
    continue;
  }

  if (!fs.existsSync(markerPath)) {
    console.log(`✅ ${themeName}: Correctly does NOT have light.mode file`);
  } else {
    console.log(`❌ ${themeName}: Should NOT have light.mode file (it's a dark theme)`);
    allPassed = false;
  }
}
console.log('');

console.log('═══════════════════════════════════════════════════════');
console.log('STEP 3: Check theme.json for light theme indication');
console.log('═══════════════════════════════════════════════════════\n');

// Verify theme.json also indicates light mode
for (const themeName of lightThemes) {
  const themePath = path.join(themesDir, themeName);
  const themeJsonPath = path.join(themePath, 'theme.json');

  if (fs.existsSync(themeJsonPath)) {
    const themeData = JSON.parse(fs.readFileSync(themeJsonPath, 'utf-8'));
    console.log(`${themeName}:`);
    console.log(`  Name: ${themeData.name}`);

    // Check if theme has variant information
    if (themeData.variant) {
      console.log(`  Variant: ${themeData.variant}`);
      if (themeData.variant === 'light') {
        console.log(`  ✅ Variant correctly set to "light"`);
      } else {
        console.log(`  ⚠️  Variant is "${themeData.variant}", not "light"`);
      }
    } else if (themeData.name.toLowerCase().includes('light') ||
               themeData.name.toLowerCase().includes('latte')) {
      console.log(`  ✅ Name indicates light theme`);
    } else {
      console.log(`  ⚠️  No variant field, but has light.mode marker`);
    }
  }
  console.log('');
}

console.log('═══════════════════════════════════════════════════════');
console.log('TEST RESULT');
console.log('═══════════════════════════════════════════════════════\n');

if (allPassed) {
  console.log('🎉 TEST PASSED!\n');
  console.log('All light themes have the light.mode marker file.');
  console.log('All dark themes correctly do NOT have the marker.');
  console.log('\nTest #146 can be marked as passing.\n');
  process.exit(0);
} else {
  console.log('❌ TEST FAILED\n');
  console.log('Some themes are missing the light.mode marker or have incorrect markers.\n');
  process.exit(1);
}
