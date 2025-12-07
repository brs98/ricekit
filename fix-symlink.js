#!/usr/bin/env node

/**
 * Fix missing theme symlink by manually applying tokyo-night theme
 */

const fs = require('fs');
const path = require('path');

const MACTHEME_DIR = path.join(require('os').homedir(), 'Library/Application Support/MacTheme');
const THEMES_DIR = path.join(MACTHEME_DIR, 'themes');
const CURRENT_DIR = path.join(MACTHEME_DIR, 'current');
const SYMLINK_PATH = path.join(CURRENT_DIR, 'theme');

console.log('🔧 Fixing theme symlink...\n');

// Ensure current directory exists
if (!fs.existsSync(CURRENT_DIR)) {
  fs.mkdirSync(CURRENT_DIR, { recursive: true });
  console.log('✓ Created current directory');
}

// Remove existing symlink if it exists
if (fs.existsSync(SYMLINK_PATH)) {
  const stats = fs.lstatSync(SYMLINK_PATH);
  if (stats.isSymbolicLink() || stats.isDirectory()) {
    fs.rmSync(SYMLINK_PATH, { recursive: true, force: true });
    console.log('✓ Removed existing symlink/directory');
  }
}

// Get theme from state
const statePath = path.join(MACTHEME_DIR, 'state.json');
let themeName = 'tokyo-night'; // default

if (fs.existsSync(statePath)) {
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  if (state.currentTheme) {
    themeName = state.currentTheme;
  }
}

console.log(`✓ Applying theme: ${themeName}`);

// Create symlink
const themePath = path.join(THEMES_DIR, themeName);
if (!fs.existsSync(themePath)) {
  console.error(`❌ Theme not found: ${themePath}`);
  process.exit(1);
}

try {
  fs.symlinkSync(themePath, SYMLINK_PATH, 'dir');
  console.log(`✓ Created symlink: ${SYMLINK_PATH} -> ${themePath}`);

  // Verify
  const target = fs.readlinkSync(SYMLINK_PATH);
  console.log(`✓ Verified symlink points to: ${target}`);

  console.log('\n✅ Symlink fixed successfully!\n');
} catch (err) {
  console.error(`❌ Failed to create symlink: ${err.message}`);
  process.exit(1);
}
