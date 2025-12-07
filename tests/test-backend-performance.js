#!/usr/bin/env node

/**
 * Test backend performance of theme loading with 112 themes
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const THEMES_DIR = path.join(os.homedir(), 'Library/Application Support/MacTheme/themes');
const CUSTOM_THEMES_DIR = path.join(os.homedir(), 'Library/Application Support/MacTheme/custom-themes');

// Simulate the theme loading logic from main process
function loadThemeFromDirectory(themeDir, themeName) {
  try {
    const themeJsonPath = path.join(themeDir, 'theme.json');
    if (!fs.existsSync(themeJsonPath)) {
      return null;
    }

    const themeData = JSON.parse(fs.readFileSync(themeJsonPath, 'utf8'));
    return {
      id: themeName,
      name: themeData.name || themeName,
      author: themeData.author || 'Unknown',
      description: themeData.description || '',
      colors: themeData.colors || {},
      isCustom: themeDir.includes('custom-themes')
    };
  } catch (error) {
    return null;
  }
}

function listAllThemes() {
  const themes = [];

  // Load bundled themes
  if (fs.existsSync(THEMES_DIR)) {
    const themeDirs = fs.readdirSync(THEMES_DIR);
    for (const dirName of themeDirs) {
      const themePath = path.join(THEMES_DIR, dirName);
      if (fs.statSync(themePath).isDirectory()) {
        const theme = loadThemeFromDirectory(themePath, dirName);
        if (theme) {
          themes.push(theme);
        }
      }
    }
  }

  // Load custom themes
  if (fs.existsSync(CUSTOM_THEMES_DIR)) {
    const customThemeDirs = fs.readdirSync(CUSTOM_THEMES_DIR);
    for (const dirName of customThemeDirs) {
      const themePath = path.join(CUSTOM_THEMES_DIR, dirName);
      if (fs.statSync(themePath).isDirectory()) {
        const theme = loadThemeFromDirectory(themePath, dirName);
        if (theme) {
          themes.push(theme);
        }
      }
    }
  }

  return themes;
}

console.log('============================================================');
console.log('BACKEND PERFORMANCE TEST - Theme Loading');
console.log('============================================================\n');

// Run 5 iterations to get average
const iterations = 5;
const times = [];

for (let i = 0; i < iterations; i++) {
  const startTime = performance.now();
  const themes = listAllThemes();
  const endTime = performance.now();
  const duration = endTime - startTime;

  times.push(duration);

  console.log(`Iteration ${i + 1}: Loaded ${themes.length} themes in ${duration.toFixed(2)}ms`);
}

const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
const minTime = Math.min(...times);
const maxTime = Math.max(...times);

console.log('\n============================================================');
console.log('RESULTS');
console.log('============================================================');
console.log(`Average: ${avgTime.toFixed(2)}ms`);
console.log(`Min: ${minTime.toFixed(2)}ms`);
console.log(`Max: ${maxTime.toFixed(2)}ms`);
console.log('');

if (avgTime < 5000) {
  console.log(`✅ PASS: Average load time (${avgTime.toFixed(2)}ms) is under 5 seconds`);
} else {
  console.log(`❌ FAIL: Average load time (${avgTime.toFixed(2)}ms) exceeds 5 seconds`);
}

if (avgTime < 1000) {
  console.log(`🚀 EXCELLENT: Load time is under 1 second!`);
} else if (avgTime < 2000) {
  console.log(`👍 GOOD: Load time is under 2 seconds`);
}

console.log('\n============================================================\n');
