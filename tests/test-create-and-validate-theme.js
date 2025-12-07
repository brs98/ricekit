#!/usr/bin/env node

/**
 * Test: Create a custom theme and validate all generated config files
 * This tests the complete flow from theme creation to config validation
 */

const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const toml = require('@iarna/toml');
const yaml = require('js-yaml');

const homeDir = require('os').homedir();
const customThemesDir = path.join(homeDir, 'Library', 'Application Support', 'MacTheme', 'custom-themes');

// Test theme metadata
const testTheme = {
  name: 'Validation Test Theme',
  author: 'Test Suite',
  description: 'A theme created to test config validation',
  version: '1.0.0',
  colors: {
    background: '#1a1b26',
    foreground: '#c0caf5',
    cursor: '#c0caf5',
    selection: '#283457',
    black: '#15161e',
    red: '#f7768e',
    green: '#9ece6a',
    yellow: '#e0af68',
    blue: '#7aa2f7',
    magenta: '#bb9af7',
    cyan: '#7dcfff',
    white: '#a9b1d6',
    brightBlack: '#414868',
    brightRed: '#f7768e',
    brightGreen: '#9ece6a',
    brightYellow: '#e0af68',
    brightBlue: '#7aa2f7',
    brightMagenta: '#bb9af7',
    brightCyan: '#7dcfff',
    brightWhite: '#c0caf5',
    accent: '#7aa2f7',
    border: '#414868',
  },
};

async function runTest() {
  console.log('='.repeat(80));
  console.log('TEST: Create Custom Theme and Validate All Config Files');
  console.log('='.repeat(80));

  try {
    // Step 1: Create theme via IPC
    console.log('\nStep 1: Creating custom theme...');
    const ipcMain = require('electron').ipcMain;

    // Dynamically import the IPC handlers
    const { setupIpcHandlers } = require('./dist/main/ipcHandlers.js');
    setupIpcHandlers();

    // Simulate theme creation
    const createHandler = ipcMain._events['theme:create'];
    if (!createHandler) {
      throw new Error('theme:create IPC handler not found');
    }

    await createHandler[0](null, testTheme);
    console.log('  ✓ Theme created successfully');

    // Step 2: Find the created theme directory
    const themeDirName = testTheme.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const themeDir = path.join(customThemesDir, themeDirName);

    if (!fs.existsSync(themeDir)) {
      throw new Error(`Theme directory not created: ${themeDir}`);
    }
    console.log(`  ✓ Theme directory exists: ${themeDir}`);

    // Step 3: Validate all config files
    console.log('\nStep 2: Validating generated config files...');

    const validations = [
      { name: 'Alacritty TOML', file: 'alacritty.toml', validator: validateAlacritty },
      { name: 'Kitty Config', file: 'kitty.conf', validator: validateKitty },
      { name: 'Warp YAML', file: 'warp.yaml', validator: validateWarp },
      { name: 'Hyper.js', file: 'hyper.js', validator: validateHyper },
      { name: 'Starship TOML', file: 'starship.toml', validator: validateStarship },
      { name: 'iTerm2 Colors', file: 'iterm2.itermcolors', validator: validateIterm2 },
      { name: 'VS Code JSON', file: 'vscode.json', validator: validateVSCode },
      { name: 'Neovim Lua', file: 'neovim.lua', validator: validateNeovim },
    ];

    let allPassed = true;

    for (const validation of validations) {
      const configPath = path.join(themeDir, validation.file);
      if (!fs.existsSync(configPath)) {
        console.log(`  ✗ ${validation.name}: File not found`);
        allPassed = false;
        continue;
      }

      try {
        validation.validator(configPath);
        console.log(`  ✓ ${validation.name}: Valid`);
      } catch (error) {
        console.log(`  ✗ ${validation.name}: ${error.message}`);
        allPassed = false;
      }
    }

    // Step 4: Cleanup
    console.log('\nStep 3: Cleaning up...');
    fs.rmSync(themeDir, { recursive: true, force: true });
    console.log('  ✓ Test theme removed');

    // Final result
    console.log('\n' + '='.repeat(80));
    if (allPassed) {
      console.log('✅ ALL TESTS PASSED');
      console.log('Custom theme creation generates valid config files for all supported apps.');
    } else {
      console.log('❌ SOME TESTS FAILED');
      console.log('Review errors above.');
    }
    console.log('='.repeat(80));

    app.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('\n❌ TEST ERROR:', error);
    app.exit(1);
  }
}

// Validation functions
function validateAlacritty(configPath) {
  const content = fs.readFileSync(configPath, 'utf-8');
  const parsed = toml.parse(content);

  if (!parsed.colors || !parsed.colors.primary || !parsed.colors.normal || !parsed.colors.bright) {
    throw new Error('Missing required color sections');
  }

  if (!parsed.colors.primary.background || !parsed.colors.primary.foreground) {
    throw new Error('Missing primary colors');
  }
}

function validateKitty(configPath) {
  const content = fs.readFileSync(configPath, 'utf-8');

  const required = ['background', 'foreground', 'cursor', 'selection_background', 'selection_foreground'];
  for (const setting of required) {
    if (!content.includes(setting)) {
      throw new Error(`Missing ${setting}`);
    }
  }

  for (let i = 0; i <= 15; i++) {
    if (!content.includes(`color${i}`)) {
      throw new Error(`Missing color${i}`);
    }
  }
}

function validateWarp(configPath) {
  const content = fs.readFileSync(configPath, 'utf-8');
  const parsed = yaml.load(content);

  if (!parsed.background || !parsed.foreground || !parsed.terminal_colors) {
    throw new Error('Missing required properties');
  }

  if (!parsed.terminal_colors.normal || !parsed.terminal_colors.bright) {
    throw new Error('Missing terminal color sections');
  }
}

function validateHyper(configPath) {
  const content = fs.readFileSync(configPath, 'utf-8');

  if (!content.includes('module.exports')) {
    throw new Error('Missing module.exports');
  }

  const required = ['backgroundColor', 'foregroundColor', 'cursorColor', 'colors'];
  for (const prop of required) {
    if (!content.includes(prop)) {
      throw new Error(`Missing ${prop}`);
    }
  }
}

function validateStarship(configPath) {
  const content = fs.readFileSync(configPath, 'utf-8');
  const parsed = toml.parse(content);

  if (!parsed.format) {
    throw new Error('Missing format property');
  }
}

function validateIterm2(configPath) {
  const content = fs.readFileSync(configPath, 'utf-8');

  if (!content.includes('<?xml version="1.0"')) {
    throw new Error('Not valid XML');
  }

  if (!content.includes('Background Color') || !content.includes('Foreground Color')) {
    throw new Error('Missing required colors');
  }
}

function validateVSCode(configPath) {
  const content = fs.readFileSync(configPath, 'utf-8');
  const parsed = JSON.parse(content);

  if (!parsed.workbench || !parsed.workbench.colorCustomizations) {
    throw new Error('Missing workbench.colorCustomizations');
  }
}

function validateNeovim(configPath) {
  const content = fs.readFileSync(configPath, 'utf-8');

  if (!content.includes('vim.cmd')) {
    throw new Error('Missing vim.cmd');
  }

  const required = ['Normal', 'Cursor', 'Visual'];
  for (const highlight of required) {
    if (!content.includes(highlight)) {
      throw new Error(`Missing ${highlight} highlight`);
    }
  }
}

// Run test when app is ready
app.whenReady().then(runTest);
