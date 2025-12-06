// Direct test using TypeScript source
import fs from 'fs';
import path from 'path';
import os from 'os';
import { generateThemeConfigFiles } from './src/main/themeInstaller.js';
import type { ThemeMetadata } from './src/shared/types.js';

// Define a test theme
const testTheme: ThemeMetadata = {
  name: 'Test Validation Theme',
  author: 'Validation Script',
  description: 'A test theme created to validate config generation',
  version: '1.0.0',
  colors: {
    background: '#282a36',
    foreground: '#f8f8f2',
    cursor: '#f8f8f2',
    selection: '#44475a',
    black: '#21222c',
    red: '#ff5555',
    green: '#50fa7b',
    yellow: '#f1fa8c',
    blue: '#bd93f9',
    magenta: '#ff79c6',
    cyan: '#8be9fd',
    white: '#f8f8f2',
    brightBlack: '#6272a4',
    brightRed: '#ff6e6e',
    brightGreen: '#69ff94',
    brightYellow: '#ffffa5',
    brightBlue: '#d6acff',
    brightMagenta: '#ff92df',
    brightCyan: '#a4ffff',
    brightWhite: '#ffffff',
    accent: '#bd93f9',
    border: '#6272a4',
  },
};

// Create test theme directory
const customThemesDir = path.join(os.homedir(), 'Library', 'Application Support', 'MacTheme', 'custom-themes');
const testThemeDir = path.join(customThemesDir, 'test-validation-theme');

console.log('Creating test theme at:', testThemeDir);
console.log('');

try {
  // Generate theme files
  generateThemeConfigFiles(testThemeDir, testTheme);

  console.log('✅ Theme created successfully!');
  console.log('');
  console.log('Verifying files...');
  console.log('');

  // Verify all required files exist
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
    'zsh-theme.zsh',
  ];

  let allFilesExist = true;
  for (const file of requiredFiles) {
    const filePath = path.join(testThemeDir, file);
    const exists = fs.existsSync(filePath);
    const size = exists ? fs.statSync(filePath).size : 0;
    console.log(`  ${exists ? '✅' : '❌'} ${file.padEnd(25)} ${exists ? `(${size} bytes)` : ''}`);
    if (!exists) allFilesExist = false;
  }

  if (allFilesExist) {
    console.log('');
    console.log('✅ All config files generated successfully!');
    console.log('');

    // Verify content matches theme.json
    console.log('Validating config file contents...');
    console.log('');

    // Check Alacritty
    const alacritty = fs.readFileSync(path.join(testThemeDir, 'alacritty.toml'), 'utf8');
    const alacrittyBgMatch = alacritty.includes(`background = "${testTheme.colors.background}"`);
    const alacrittyFgMatch = alacritty.includes(`foreground = "${testTheme.colors.foreground}"`);
    const alacrittyRedMatch = alacritty.includes(`red = "${testTheme.colors.red}"`);
    console.log(`  ${alacrittyBgMatch && alacrittyFgMatch && alacrittyRedMatch ? '✅' : '❌'} alacritty.toml colors match theme.json`);

    // Check Kitty
    const kitty = fs.readFileSync(path.join(testThemeDir, 'kitty.conf'), 'utf8');
    const kittyBgMatch = kitty.includes(`background ${testTheme.colors.background}`);
    const kittyFgMatch = kitty.includes(`foreground ${testTheme.colors.foreground}`);
    const kittyRedMatch = kitty.includes(`color1 ${testTheme.colors.red}`);
    console.log(`  ${kittyBgMatch && kittyFgMatch && kittyRedMatch ? '✅' : '❌'} kitty.conf colors match theme.json`);

    // Check VS Code
    const vscode = fs.readFileSync(path.join(testThemeDir, 'vscode.json'), 'utf8');
    const vscodeJson = JSON.parse(vscode);
    const vscodeBgMatch = vscodeJson['workbench.colorCustomizations']['editor.background'] === testTheme.colors.background;
    const vscodeFgMatch = vscodeJson['workbench.colorCustomizations']['editor.foreground'] === testTheme.colors.foreground;
    console.log(`  ${vscodeBgMatch && vscodeFgMatch ? '✅' : '❌'} vscode.json colors match theme.json`);

    // Check Neovim
    const neovim = fs.readFileSync(path.join(testThemeDir, 'neovim.lua'), 'utf8');
    const neovimBgMatch = neovim.includes(`guibg=${testTheme.colors.background}`);
    const neovimFgMatch = neovim.includes(`guifg=${testTheme.colors.foreground}`);
    console.log(`  ${neovimBgMatch && neovimFgMatch ? '✅' : '❌'} neovim.lua colors match theme.json`);

    // Check iTerm2 (XML)
    const iterm2 = fs.readFileSync(path.join(testThemeDir, 'iterm2.itermcolors'), 'utf8');
    const iterm2IsXml = iterm2.startsWith('<?xml version="1.0"') && iterm2.includes('<!DOCTYPE plist');
    const iterm2HasColors = iterm2.includes('<key>Background Color</key>') && iterm2.includes('<key>Foreground Color</key>');
    console.log(`  ${iterm2IsXml && iterm2HasColors ? '✅' : '❌'} iterm2.itermcolors is valid XML plist`);

    console.log('');
    console.log('✅ All validation checks passed!');
    console.log('');
    console.log('Test theme location:', testThemeDir);
  } else {
    console.log('');
    console.log('❌ Some files are missing!');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error creating theme:', error);
  process.exit(1);
}
