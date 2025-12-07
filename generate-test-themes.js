#!/usr/bin/env node

/**
 * Script to generate 100 custom test themes for performance testing
 * Test #116: Large number of custom themes (100+) performs well
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const CUSTOM_THEMES_DIR = path.join(
  os.homedir(),
  'Library/Application Support/MacTheme/custom-themes'
);

const NUM_THEMES = 100;

// Helper to generate random color
function randomColor() {
  return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
}

// Helper to generate a theme color palette
function generatePalette() {
  return {
    background: randomColor(),
    foreground: randomColor(),
    cursor: randomColor(),
    selection: randomColor(),
    black: randomColor(),
    red: randomColor(),
    green: randomColor(),
    yellow: randomColor(),
    blue: randomColor(),
    magenta: randomColor(),
    cyan: randomColor(),
    white: randomColor(),
    brightBlack: randomColor(),
    brightRed: randomColor(),
    brightGreen: randomColor(),
    brightYellow: randomColor(),
    brightBlue: randomColor(),
    brightMagenta: randomColor(),
    brightCyan: randomColor(),
    brightWhite: randomColor(),
    accent: randomColor(),
    border: randomColor()
  };
}

// Generate theme.json content
function generateThemeJson(index) {
  const palette = generatePalette();

  return {
    name: `Test Theme ${String(index).padStart(3, '0')}`,
    author: 'Performance Test Generator',
    description: `Automatically generated test theme ${index} for performance testing`,
    version: '1.0.0',
    colors: palette,
    variants: null,
    preview: null
  };
}

// Generate Alacritty config
function generateAlacrittyConfig(colors) {
  return `[colors.primary]
background = "${colors.background}"
foreground = "${colors.foreground}"

[colors.cursor]
cursor = "${colors.cursor}"

[colors.selection]
background = "${colors.selection}"

[colors.normal]
black = "${colors.black}"
red = "${colors.red}"
green = "${colors.green}"
yellow = "${colors.yellow}"
blue = "${colors.blue}"
magenta = "${colors.magenta}"
cyan = "${colors.cyan}"
white = "${colors.white}"

[colors.bright]
black = "${colors.brightBlack}"
red = "${colors.brightRed}"
green = "${colors.brightGreen}"
yellow = "${colors.brightYellow}"
blue = "${colors.brightBlue}"
magenta = "${colors.brightMagenta}"
cyan = "${colors.brightCyan}"
white = "${colors.brightWhite}"
`;
}

// Generate Kitty config
function generateKittyConfig(colors) {
  return `# Kitty Terminal Theme
background ${colors.background}
foreground ${colors.foreground}
cursor ${colors.cursor}
selection_background ${colors.selection}

# Black
color0 ${colors.black}
color8 ${colors.brightBlack}

# Red
color1 ${colors.red}
color9 ${colors.brightRed}

# Green
color2 ${colors.green}
color10 ${colors.brightGreen}

# Yellow
color3 ${colors.yellow}
color11 ${colors.brightYellow}

# Blue
color4 ${colors.blue}
color12 ${colors.brightBlue}

# Magenta
color5 ${colors.magenta}
color13 ${colors.brightMagenta}

# Cyan
color6 ${colors.cyan}
color14 ${colors.brightCyan}

# White
color7 ${colors.white}
color15 ${colors.brightWhite}
`;
}

// Generate VS Code theme (minimal)
function generateVSCodeTheme(colors) {
  return JSON.stringify({
    name: 'Generated Theme',
    type: 'dark',
    colors: {
      'editor.background': colors.background,
      'editor.foreground': colors.foreground,
      'editorCursor.foreground': colors.cursor
    }
  }, null, 2);
}

// Main function
async function generateThemes() {
  console.log('============================================================');
  console.log('GENERATING 100 TEST THEMES FOR PERFORMANCE TESTING');
  console.log('============================================================\n');

  // Ensure custom-themes directory exists
  if (!fs.existsSync(CUSTOM_THEMES_DIR)) {
    fs.mkdirSync(CUSTOM_THEMES_DIR, { recursive: true });
    console.log(`✓ Created directory: ${CUSTOM_THEMES_DIR}\n`);
  }

  let successCount = 0;
  let errorCount = 0;

  for (let i = 1; i <= NUM_THEMES; i++) {
    const themeName = `test-theme-${String(i).padStart(3, '0')}`;
    const themeDir = path.join(CUSTOM_THEMES_DIR, themeName);

    try {
      // Create theme directory
      if (!fs.existsSync(themeDir)) {
        fs.mkdirSync(themeDir, { recursive: true });
      }

      // Generate theme data
      const themeData = generateThemeJson(i);
      const colors = themeData.colors;

      // Write theme.json
      fs.writeFileSync(
        path.join(themeDir, 'theme.json'),
        JSON.stringify(themeData, null, 2)
      );

      // Write config files
      fs.writeFileSync(
        path.join(themeDir, 'alacritty.toml'),
        generateAlacrittyConfig(colors)
      );

      fs.writeFileSync(
        path.join(themeDir, 'kitty.conf'),
        generateKittyConfig(colors)
      );

      fs.writeFileSync(
        path.join(themeDir, 'vscode.json'),
        generateVSCodeTheme(colors)
      );

      successCount++;

      if (i % 10 === 0) {
        console.log(`✓ Generated ${i}/${NUM_THEMES} themes...`);
      }
    } catch (error) {
      console.error(`✗ Error generating theme ${i}: ${error.message}`);
      errorCount++;
    }
  }

  console.log('\n============================================================');
  console.log('SUMMARY');
  console.log('============================================================');
  console.log(`✓ Successfully generated: ${successCount} themes`);
  if (errorCount > 0) {
    console.log(`✗ Errors: ${errorCount}`);
  }
  console.log(`\nLocation: ${CUSTOM_THEMES_DIR}`);
  console.log('============================================================\n');

  // List directory contents to verify
  const allThemes = fs.readdirSync(CUSTOM_THEMES_DIR);
  const testThemes = allThemes.filter(name => name.startsWith('test-theme-'));
  console.log(`Total test themes in directory: ${testThemes.length}`);
  console.log('\nReady for performance testing!\n');
}

// Run
generateThemes().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
