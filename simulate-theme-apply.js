/**
 * Simulate theme applications to test recent themes tracking
 * This script directly modifies the state and preferences files as the IPC handler would
 */

const fs = require('fs');
const path = require('path');

const macthemeDir = path.join(process.env.HOME, 'Library/Application Support/MacTheme');
const prefsPath = path.join(macthemeDir, 'preferences.json');
const statePath = path.join(macthemeDir, 'state.json');

console.log('Simulating theme applications to test recent themes tracking...\n');

// Themes to apply in sequence
const themesToApply = ['tokyo-night', 'nord', 'dracula', 'catppuccin-mocha', 'gruvbox-dark'];

console.log(`Will apply these themes in order: ${themesToApply.join(', ')}\n`);

// Read current preferences
const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf-8'));
console.log('Current preferences:');
console.log(`  recentThemes: ${JSON.stringify(prefs.recentThemes || [])}\n`);

// Apply each theme
themesToApply.forEach((themeName, index) => {
  console.log(`${index + 1}. Applying theme: ${themeName}`);

  // Update state (as the IPC handler does)
  const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  state.currentTheme = themeName;
  state.lastSwitched = Date.now();
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

  // Update recent themes in preferences (as the IPC handler does)
  if (!prefs.recentThemes) {
    prefs.recentThemes = [];
  }

  // Remove if already exists to avoid duplicates
  prefs.recentThemes = prefs.recentThemes.filter(t => t !== themeName);

  // Add to beginning
  prefs.recentThemes.unshift(themeName);

  // Keep only last 10
  if (prefs.recentThemes.length > 10) {
    prefs.recentThemes = prefs.recentThemes.slice(0, 10);
  }

  fs.writeFileSync(prefsPath, JSON.stringify(prefs, null, 2));
  console.log(`   Updated recentThemes: [${prefs.recentThemes.slice(0, 5).join(', ')}...]`);
});

console.log('\n✓ Simulation complete!');
console.log('\nFinal state:');
console.log(`  Current theme: ${JSON.parse(fs.readFileSync(statePath, 'utf-8')).currentTheme}`);
console.log(`  Recent themes: ${JSON.stringify(prefs.recentThemes)}`);
console.log('\nTest verification:');
console.log('  1. Recent themes array should contain 5 themes');
console.log('  2. They should be in reverse chronological order (most recent first)');
console.log('  3. gruvbox-dark should be first (most recent)');
console.log('  4. tokyo-night should be last (least recent of these 5)');
console.log('\nVerify by running: node test-theme-apply.js\n');
