// Test script to create a custom theme and verify config generation
const fs = require('fs');
const path = require('path');
const os = require('os');

// Import the generateThemeConfigFiles function
const { generateThemeConfigFiles } = require('./dist/main/themeInstaller.js');

// Define a test theme
const testTheme = {
  name: 'Test Theme',
  author: 'Test Author',
  description: 'A test theme for validation',
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

// Create test theme directory
const customThemesDir = path.join(os.homedir(), 'Library', 'Application Support', 'Ricekit', 'custom-themes');
const testThemeDir = path.join(customThemesDir, 'test-theme');

console.log('Creating test theme at:', testThemeDir);

try {
  // Generate theme files
  generateThemeConfigFiles(testThemeDir, testTheme);

  console.log('✅ Theme created successfully!');
  console.log('\nVerifying files...');

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
    console.log(`  ${exists ? '✅' : '❌'} ${file}`);
    if (!exists) allFilesExist = false;
  }

  if (allFilesExist) {
    console.log('\n✅ All config files generated successfully!');

    // Read and display sample content
    console.log('\n--- Sample: alacritty.toml (first 10 lines) ---');
    const alacritty = fs.readFileSync(path.join(testThemeDir, 'alacritty.toml'), 'utf8');
    console.log(alacritty.split('\n').slice(0, 10).join('\n'));

    console.log('\n--- Sample: kitty.conf (first 10 lines) ---');
    const kitty = fs.readFileSync(path.join(testThemeDir, 'kitty.conf'), 'utf8');
    console.log(kitty.split('\n').slice(0, 10).join('\n'));

    console.log('\n--- Sample: theme.json ---');
    const themeJson = fs.readFileSync(path.join(testThemeDir, 'theme.json'), 'utf8');
    console.log(themeJson);
  } else {
    console.log('\n❌ Some files are missing!');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error creating theme:', error);
  process.exit(1);
}
