import fs from 'fs';
import path from 'path';
import { getThemesDir } from './directories';
import type { ThemeMetadata, ThemeColors } from '../shared/types';

/**
 * Install bundled themes to the themes directory
 */
export function installBundledThemes(): void {
  const themesDir = getThemesDir();
  const bundledThemesDir = path.join(__dirname, '../../bundled-themes');

  console.log('Installing bundled themes...');
  console.log('Bundled themes dir:', bundledThemesDir);
  console.log('Target themes dir:', themesDir);

  // Check if bundled themes directory exists and has complete themes (with theme.json)
  let hasBundledThemes = false;
  if (fs.existsSync(bundledThemesDir)) {
    const themes = fs.readdirSync(bundledThemesDir);
    const completeThemes = themes.filter(name => {
      const themePath = path.join(bundledThemesDir, name);
      const themeJsonPath = path.join(themePath, 'theme.json');
      return fs.statSync(themePath).isDirectory() && fs.existsSync(themeJsonPath);
    });
    hasBundledThemes = completeThemes.length > 0;
  }

  if (!hasBundledThemes) {
    console.log('No bundled themes found, creating themes from templates...');
    createThemesFromTemplates();
    return;
  }

  // Copy all bundled themes to themes directory
  const themes = fs.readdirSync(bundledThemesDir);
  for (const themeName of themes) {
    const srcPath = path.join(bundledThemesDir, themeName);
    const destPath = path.join(themesDir, themeName);

    // Skip if not a directory
    if (!fs.statSync(srcPath).isDirectory()) {
      continue;
    }

    // Only install if theme doesn't already exist
    if (!fs.existsSync(destPath)) {
      copyRecursive(srcPath, destPath);
      console.log(`Installed theme: ${themeName}`);
    } else {
      console.log(`Theme already exists: ${themeName}`);
    }
  }

  console.log('Bundled themes installation complete!');
}

/**
 * Copy directory recursively
 */
function copyRecursive(src: string, dest: string): void {
  if (fs.statSync(src).isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

/**
 * Create themes from code templates (fallback if bundled themes not found)
 */
function createThemesFromTemplates(): void {
  const themesDir = getThemesDir();

  // Create Tokyo Night theme
  createTokyoNightTheme(themesDir);

  // Create Catppuccin Mocha theme
  createCatppuccinMochaTheme(themesDir);

  // Create Catppuccin Latte theme
  createCatppuccinLatteTheme(themesDir);

  // Create Gruvbox Dark theme
  createGruvboxDarkTheme(themesDir);

  // Create Gruvbox Light theme
  createGruvboxLightTheme(themesDir);

  // Create Nord theme
  createNordTheme(themesDir);

  // Create Dracula theme
  createDraculaTheme(themesDir);

  // Create One Dark theme
  createOneDarkTheme(themesDir);

  // Create Solarized Dark theme
  createSolarizedDarkTheme(themesDir);

  // Create Solarized Light theme
  createSolarizedLightTheme(themesDir);

  // Create Rose Pine theme
  createRosePineTheme(themesDir);

  console.log('Created all 11 bundled themes from templates');

  // Copy wallpapers from bundled-themes if available
  copyBundledWallpapers(themesDir);
}

/**
 * Copy wallpapers from bundled-themes directory to created themes
 * This allows wallpapers to be distributed with the app without duplicating theme configs
 */
function copyBundledWallpapers(themesDir: string): void {
  const bundledThemesDir = path.join(__dirname, '../../bundled-themes');

  if (!fs.existsSync(bundledThemesDir)) {
    console.log('No bundled-themes directory found, skipping wallpaper copy');
    return;
  }

  const bundledThemes = fs.readdirSync(bundledThemesDir);
  for (const themeName of bundledThemes) {
    const bundledWallpapersDir = path.join(bundledThemesDir, themeName, 'wallpapers');

    if (!fs.existsSync(bundledWallpapersDir)) {
      continue;
    }

    const destThemeDir = path.join(themesDir, themeName);
    if (!fs.existsSync(destThemeDir)) {
      console.log(`Theme ${themeName} not found in themes directory, skipping wallpaper copy`);
      continue;
    }

    const destWallpapersDir = path.join(destThemeDir, 'wallpapers');
    if (!fs.existsSync(destWallpapersDir)) {
      fs.mkdirSync(destWallpapersDir, { recursive: true });
    }

    // Copy all wallpapers
    const wallpaperFiles = fs.readdirSync(bundledWallpapersDir);
    for (const file of wallpaperFiles) {
      const srcPath = path.join(bundledWallpapersDir, file);
      const destPath = path.join(destWallpapersDir, file);

      // Only copy if destination doesn't exist
      if (!fs.existsSync(destPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`Copied wallpaper: ${themeName}/${file}`);
      }
    }
  }

  console.log('Finished copying bundled wallpapers');
}

function createTokyoNightTheme(themesDir: string): void {
  const themeDir = path.join(themesDir, 'tokyo-night');
  fs.mkdirSync(themeDir, { recursive: true });

  const metadata = {
    name: 'Tokyo Night',
    author: 'enkia',
    description: 'A clean, dark theme inspired by the city lights of Tokyo at night',
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

  fs.writeFileSync(path.join(themeDir, 'theme.json'), JSON.stringify(metadata, null, 2));

  // Create placeholder config files
  fs.writeFileSync(path.join(themeDir, 'alacritty.toml'), generateAlacrittyConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'kitty.conf'), generateKittyConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'iterm2.itermcolors'), generateIterm2Config(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'warp.yaml'), generateWarpConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'hyper.js'), generateHyperConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'vscode.json'), generateVSCodeConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'cursor.json'), generateCursorConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'neovim.lua'), generateNeovimConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'raycast.json'), generateRaycastConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'bat.conf'), generateBatConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'delta.gitconfig'), generateDeltaConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'starship.toml'), generateStarshipConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'zsh-theme.zsh'), generateZshConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'sketchybar-colors.sh'), generateSketchybarConfig(metadata.colors));
}

function createCatppuccinMochaTheme(themesDir: string): void {
  const themeDir = path.join(themesDir, 'catppuccin-mocha');
  fs.mkdirSync(themeDir, { recursive: true });

  const metadata = {
    name: 'Catppuccin Mocha',
    author: 'Catppuccin',
    description: 'Soothing pastel theme for the high-spirited - Mocha variant',
    version: '1.0.0',
    colors: {
      background: '#1e1e2e',
      foreground: '#cdd6f4',
      cursor: '#f5e0dc',
      selection: '#585b70',
      black: '#45475a',
      red: '#f38ba8',
      green: '#a6e3a1',
      yellow: '#f9e2af',
      blue: '#89b4fa',
      magenta: '#f5c2e7',
      cyan: '#94e2d5',
      white: '#bac2de',
      brightBlack: '#585b70',
      brightRed: '#f38ba8',
      brightGreen: '#a6e3a1',
      brightYellow: '#f9e2af',
      brightBlue: '#89b4fa',
      brightMagenta: '#f5c2e7',
      brightCyan: '#94e2d5',
      brightWhite: '#a6adc8',
      accent: '#89b4fa',
      border: '#585b70',
    },
  };

  fs.writeFileSync(path.join(themeDir, 'theme.json'), JSON.stringify(metadata, null, 2));
  fs.writeFileSync(path.join(themeDir, 'alacritty.toml'), generateAlacrittyConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'kitty.conf'), generateKittyConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'iterm2.itermcolors'), generateIterm2Config(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'warp.yaml'), generateWarpConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'hyper.js'), generateHyperConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'wezterm.lua'), generateWeztermConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'vscode.json'), generateVSCodeConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'cursor.json'), generateCursorConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'neovim.lua'), generateNeovimConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'raycast.json'), generateRaycastConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'bat.conf'), generateBatConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'delta.gitconfig'), generateDeltaConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'starship.toml'), generateStarshipConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'zsh-theme.zsh'), generateZshConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'sketchybar-colors.sh'), generateSketchybarConfig(metadata.colors));
}

function createCatppuccinLatteTheme(themesDir: string): void {
  const themeDir = path.join(themesDir, 'catppuccin-latte');
  fs.mkdirSync(themeDir, { recursive: true });

  const metadata = {
    name: 'Catppuccin Latte',
    author: 'Catppuccin',
    description: 'Soothing pastel theme for the high-spirited - Latte variant',
    version: '1.0.0',
    colors: {
      background: '#eff1f5',
      foreground: '#4c4f69',
      cursor: '#dc8a78',
      selection: '#bcc0cc',
      black: '#5c5f77',
      red: '#d20f39',
      green: '#40a02b',
      yellow: '#df8e1d',
      blue: '#1e66f5',
      magenta: '#ea76cb',
      cyan: '#179299',
      white: '#acb0be',
      brightBlack: '#6c6f85',
      brightRed: '#d20f39',
      brightGreen: '#40a02b',
      brightYellow: '#df8e1d',
      brightBlue: '#1e66f5',
      brightMagenta: '#ea76cb',
      brightCyan: '#179299',
      brightWhite: '#bcc0cc',
      accent: '#1e66f5',
      border: '#bcc0cc',
    },
  };

  fs.writeFileSync(path.join(themeDir, 'theme.json'), JSON.stringify(metadata, null, 2));
  fs.writeFileSync(path.join(themeDir, 'light.mode'), ''); // Marker file for light theme
  fs.writeFileSync(path.join(themeDir, 'alacritty.toml'), generateAlacrittyConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'kitty.conf'), generateKittyConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'iterm2.itermcolors'), generateIterm2Config(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'warp.yaml'), generateWarpConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'hyper.js'), generateHyperConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'vscode.json'), generateVSCodeConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'cursor.json'), generateCursorConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'neovim.lua'), generateNeovimConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'raycast.json'), generateRaycastConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'bat.conf'), generateBatConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'delta.gitconfig'), generateDeltaConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'starship.toml'), generateStarshipConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'zsh-theme.zsh'), generateZshConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'sketchybar-colors.sh'), generateSketchybarConfig(metadata.colors));
}

function createGruvboxDarkTheme(themesDir: string): void {
  const themeDir = path.join(themesDir, 'gruvbox-dark');
  fs.mkdirSync(themeDir, { recursive: true });

  const metadata = {
    name: 'Gruvbox Dark',
    author: 'morhetz',
    description: 'Retro groove color scheme with earthy tones',
    version: '1.0.0',
    colors: {
      background: '#282828',
      foreground: '#ebdbb2',
      cursor: '#ebdbb2',
      selection: '#504945',
      black: '#282828',
      red: '#cc241d',
      green: '#98971a',
      yellow: '#d79921',
      blue: '#458588',
      magenta: '#b16286',
      cyan: '#689d6a',
      white: '#a89984',
      brightBlack: '#928374',
      brightRed: '#fb4934',
      brightGreen: '#b8bb26',
      brightYellow: '#fabd2f',
      brightBlue: '#83a598',
      brightMagenta: '#d3869b',
      brightCyan: '#8ec07c',
      brightWhite: '#ebdbb2',
      accent: '#d79921',
      border: '#504945',
    },
  };

  fs.writeFileSync(path.join(themeDir, 'theme.json'), JSON.stringify(metadata, null, 2));
  fs.writeFileSync(path.join(themeDir, 'alacritty.toml'), generateAlacrittyConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'kitty.conf'), generateKittyConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'iterm2.itermcolors'), generateIterm2Config(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'warp.yaml'), generateWarpConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'hyper.js'), generateHyperConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'wezterm.lua'), generateWeztermConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'vscode.json'), generateVSCodeConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'cursor.json'), generateCursorConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'neovim.lua'), generateNeovimConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'raycast.json'), generateRaycastConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'bat.conf'), generateBatConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'delta.gitconfig'), generateDeltaConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'starship.toml'), generateStarshipConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'zsh-theme.zsh'), generateZshConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'sketchybar-colors.sh'), generateSketchybarConfig(metadata.colors));
}

function createGruvboxLightTheme(themesDir: string): void {
  const themeDir = path.join(themesDir, 'gruvbox-light');
  fs.mkdirSync(themeDir, { recursive: true });

  const metadata = {
    name: 'Gruvbox Light',
    author: 'morhetz',
    description: 'Retro groove color scheme with earthy tones - Light variant',
    version: '1.0.0',
    colors: {
      background: '#fbf1c7',
      foreground: '#3c3836',
      cursor: '#3c3836',
      selection: '#d5c4a1',
      black: '#fbf1c7',
      red: '#cc241d',
      green: '#98971a',
      yellow: '#d79921',
      blue: '#458588',
      magenta: '#b16286',
      cyan: '#689d6a',
      white: '#7c6f64',
      brightBlack: '#928374',
      brightRed: '#9d0006',
      brightGreen: '#79740e',
      brightYellow: '#b57614',
      brightBlue: '#076678',
      brightMagenta: '#8f3f71',
      brightCyan: '#427b58',
      brightWhite: '#3c3836',
      accent: '#d79921',
      border: '#d5c4a1',
    },
  };

  fs.writeFileSync(path.join(themeDir, 'theme.json'), JSON.stringify(metadata, null, 2));
  fs.writeFileSync(path.join(themeDir, 'light.mode'), '');
  fs.writeFileSync(path.join(themeDir, 'alacritty.toml'), generateAlacrittyConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'kitty.conf'), generateKittyConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'iterm2.itermcolors'), generateIterm2Config(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'warp.yaml'), generateWarpConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'hyper.js'), generateHyperConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'vscode.json'), generateVSCodeConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'cursor.json'), generateCursorConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'neovim.lua'), generateNeovimConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'raycast.json'), generateRaycastConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'bat.conf'), generateBatConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'delta.gitconfig'), generateDeltaConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'starship.toml'), generateStarshipConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'zsh-theme.zsh'), generateZshConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'sketchybar-colors.sh'), generateSketchybarConfig(metadata.colors));
}

function createNordTheme(themesDir: string): void {
  const themeDir = path.join(themesDir, 'nord');
  fs.mkdirSync(themeDir, { recursive: true });

  const metadata = {
    name: 'Nord',
    author: 'Arctic Ice Studio',
    description: 'An arctic, north-bluish color palette',
    version: '1.0.0',
    colors: {
      background: '#2e3440',
      foreground: '#d8dee9',
      cursor: '#d8dee9',
      selection: '#4c566a',
      black: '#3b4252',
      red: '#bf616a',
      green: '#a3be8c',
      yellow: '#ebcb8b',
      blue: '#81a1c1',
      magenta: '#b48ead',
      cyan: '#88c0d0',
      white: '#e5e9f0',
      brightBlack: '#4c566a',
      brightRed: '#bf616a',
      brightGreen: '#a3be8c',
      brightYellow: '#ebcb8b',
      brightBlue: '#81a1c1',
      brightMagenta: '#b48ead',
      brightCyan: '#8fbcbb',
      brightWhite: '#eceff4',
      accent: '#88c0d0',
      border: '#4c566a',
    },
  };

  fs.writeFileSync(path.join(themeDir, 'theme.json'), JSON.stringify(metadata, null, 2));
  fs.writeFileSync(path.join(themeDir, 'alacritty.toml'), generateAlacrittyConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'kitty.conf'), generateKittyConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'iterm2.itermcolors'), generateIterm2Config(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'warp.yaml'), generateWarpConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'hyper.js'), generateHyperConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'wezterm.lua'), generateWeztermConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'vscode.json'), generateVSCodeConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'cursor.json'), generateCursorConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'neovim.lua'), generateNeovimConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'raycast.json'), generateRaycastConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'bat.conf'), generateBatConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'delta.gitconfig'), generateDeltaConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'starship.toml'), generateStarshipConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'zsh-theme.zsh'), generateZshConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'sketchybar-colors.sh'), generateSketchybarConfig(metadata.colors));
}

function createDraculaTheme(themesDir: string): void {
  const themeDir = path.join(themesDir, 'dracula');
  fs.mkdirSync(themeDir, { recursive: true });

  const metadata = {
    name: 'Dracula',
    author: 'Dracula Theme',
    description: 'A dark theme with vibrant colors',
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
      border: '#44475a',
    },
  };

  fs.writeFileSync(path.join(themeDir, 'theme.json'), JSON.stringify(metadata, null, 2));
  fs.writeFileSync(path.join(themeDir, 'alacritty.toml'), generateAlacrittyConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'kitty.conf'), generateKittyConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'iterm2.itermcolors'), generateIterm2Config(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'warp.yaml'), generateWarpConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'hyper.js'), generateHyperConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'wezterm.lua'), generateWeztermConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'vscode.json'), generateVSCodeConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'cursor.json'), generateCursorConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'neovim.lua'), generateNeovimConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'raycast.json'), generateRaycastConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'bat.conf'), generateBatConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'delta.gitconfig'), generateDeltaConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'starship.toml'), generateStarshipConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'zsh-theme.zsh'), generateZshConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'sketchybar-colors.sh'), generateSketchybarConfig(metadata.colors));
}

function createOneDarkTheme(themesDir: string): void {
  const themeDir = path.join(themesDir, 'one-dark');
  fs.mkdirSync(themeDir, { recursive: true });

  const metadata = {
    name: 'One Dark',
    author: 'Atom',
    description: 'Iconic One Dark theme from Atom editor',
    version: '1.0.0',
    colors: {
      background: '#282c34',
      foreground: '#abb2bf',
      cursor: '#528bff',
      selection: '#3e4451',
      black: '#282c34',
      red: '#e06c75',
      green: '#98c379',
      yellow: '#e5c07b',
      blue: '#61afef',
      magenta: '#c678dd',
      cyan: '#56b6c2',
      white: '#abb2bf',
      brightBlack: '#5c6370',
      brightRed: '#e06c75',
      brightGreen: '#98c379',
      brightYellow: '#e5c07b',
      brightBlue: '#61afef',
      brightMagenta: '#c678dd',
      brightCyan: '#56b6c2',
      brightWhite: '#ffffff',
      accent: '#61afef',
      border: '#3e4451',
    },
  };

  fs.writeFileSync(path.join(themeDir, 'theme.json'), JSON.stringify(metadata, null, 2));
  fs.writeFileSync(path.join(themeDir, 'alacritty.toml'), generateAlacrittyConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'kitty.conf'), generateKittyConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'iterm2.itermcolors'), generateIterm2Config(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'warp.yaml'), generateWarpConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'hyper.js'), generateHyperConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'wezterm.lua'), generateWeztermConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'vscode.json'), generateVSCodeConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'cursor.json'), generateCursorConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'neovim.lua'), generateNeovimConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'raycast.json'), generateRaycastConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'bat.conf'), generateBatConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'delta.gitconfig'), generateDeltaConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'starship.toml'), generateStarshipConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'zsh-theme.zsh'), generateZshConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'sketchybar-colors.sh'), generateSketchybarConfig(metadata.colors));
}

function createSolarizedDarkTheme(themesDir: string): void {
  const themeDir = path.join(themesDir, 'solarized-dark');
  fs.mkdirSync(themeDir, { recursive: true });

  const metadata = {
    name: 'Solarized Dark',
    author: 'Ethan Schoonover',
    description: 'Precision colors for machines and people',
    version: '1.0.0',
    colors: {
      background: '#002b36',
      foreground: '#839496',
      cursor: '#839496',
      selection: '#073642',
      black: '#073642',
      red: '#dc322f',
      green: '#859900',
      yellow: '#b58900',
      blue: '#268bd2',
      magenta: '#d33682',
      cyan: '#2aa198',
      white: '#eee8d5',
      brightBlack: '#002b36',
      brightRed: '#cb4b16',
      brightGreen: '#586e75',
      brightYellow: '#657b83',
      brightBlue: '#839496',
      brightMagenta: '#6c71c4',
      brightCyan: '#93a1a1',
      brightWhite: '#fdf6e3',
      accent: '#268bd2',
      border: '#073642',
    },
  };

  fs.writeFileSync(path.join(themeDir, 'theme.json'), JSON.stringify(metadata, null, 2));
  fs.writeFileSync(path.join(themeDir, 'alacritty.toml'), generateAlacrittyConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'kitty.conf'), generateKittyConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'iterm2.itermcolors'), generateIterm2Config(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'warp.yaml'), generateWarpConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'hyper.js'), generateHyperConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'wezterm.lua'), generateWeztermConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'vscode.json'), generateVSCodeConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'cursor.json'), generateCursorConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'neovim.lua'), generateNeovimConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'raycast.json'), generateRaycastConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'bat.conf'), generateBatConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'delta.gitconfig'), generateDeltaConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'starship.toml'), generateStarshipConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'zsh-theme.zsh'), generateZshConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'sketchybar-colors.sh'), generateSketchybarConfig(metadata.colors));
}

function createSolarizedLightTheme(themesDir: string): void {
  const themeDir = path.join(themesDir, 'solarized-light');
  fs.mkdirSync(themeDir, { recursive: true });

  const metadata = {
    name: 'Solarized Light',
    author: 'Ethan Schoonover',
    description: 'Precision colors for machines and people - Light variant',
    version: '1.0.0',
    colors: {
      background: '#fdf6e3',
      foreground: '#657b83',
      cursor: '#657b83',
      selection: '#eee8d5',
      black: '#073642',
      red: '#dc322f',
      green: '#859900',
      yellow: '#b58900',
      blue: '#268bd2',
      magenta: '#d33682',
      cyan: '#2aa198',
      white: '#eee8d5',
      brightBlack: '#002b36',
      brightRed: '#cb4b16',
      brightGreen: '#586e75',
      brightYellow: '#657b83',
      brightBlue: '#839496',
      brightMagenta: '#6c71c4',
      brightCyan: '#93a1a1',
      brightWhite: '#fdf6e3',
      accent: '#268bd2',
      border: '#eee8d5',
    },
  };

  fs.writeFileSync(path.join(themeDir, 'theme.json'), JSON.stringify(metadata, null, 2));
  fs.writeFileSync(path.join(themeDir, 'light.mode'), '');
  fs.writeFileSync(path.join(themeDir, 'alacritty.toml'), generateAlacrittyConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'kitty.conf'), generateKittyConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'iterm2.itermcolors'), generateIterm2Config(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'warp.yaml'), generateWarpConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'hyper.js'), generateHyperConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'vscode.json'), generateVSCodeConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'cursor.json'), generateCursorConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'neovim.lua'), generateNeovimConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'raycast.json'), generateRaycastConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'bat.conf'), generateBatConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'delta.gitconfig'), generateDeltaConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'starship.toml'), generateStarshipConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'zsh-theme.zsh'), generateZshConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'sketchybar-colors.sh'), generateSketchybarConfig(metadata.colors));
}

function createRosePineTheme(themesDir: string): void {
  const themeDir = path.join(themesDir, 'rose-pine');
  fs.mkdirSync(themeDir, { recursive: true });

  const metadata = {
    name: 'Rosé Pine',
    author: 'Rosé Pine',
    description: 'All natural pine, faux fur and a bit of soho vibes',
    version: '1.0.0',
    colors: {
      background: '#191724',
      foreground: '#e0def4',
      cursor: '#524f67',
      selection: '#2a273f',
      black: '#26233a',
      red: '#eb6f92',
      green: '#9ccfd8',
      yellow: '#f6c177',
      blue: '#31748f',
      magenta: '#c4a7e7',
      cyan: '#ebbcba',
      white: '#e0def4',
      brightBlack: '#6e6a86',
      brightRed: '#eb6f92',
      brightGreen: '#9ccfd8',
      brightYellow: '#f6c177',
      brightBlue: '#31748f',
      brightMagenta: '#c4a7e7',
      brightCyan: '#ebbcba',
      brightWhite: '#e0def4',
      accent: '#c4a7e7',
      border: '#2a273f',
    },
  };

  fs.writeFileSync(path.join(themeDir, 'theme.json'), JSON.stringify(metadata, null, 2));
  fs.writeFileSync(path.join(themeDir, 'alacritty.toml'), generateAlacrittyConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'kitty.conf'), generateKittyConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'iterm2.itermcolors'), generateIterm2Config(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'warp.yaml'), generateWarpConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'hyper.js'), generateHyperConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'wezterm.lua'), generateWeztermConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'vscode.json'), generateVSCodeConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'cursor.json'), generateCursorConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'neovim.lua'), generateNeovimConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'raycast.json'), generateRaycastConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'bat.conf'), generateBatConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'delta.gitconfig'), generateDeltaConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'starship.toml'), generateStarshipConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'zsh-theme.zsh'), generateZshConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'sketchybar-colors.sh'), generateSketchybarConfig(metadata.colors));
}

// Config generators
function generateAlacrittyConfig(colors: any): string {
  return `# Alacritty color configuration
[colors.primary]
background = "${colors.background}"
foreground = "${colors.foreground}"

[colors.cursor]
text = "${colors.background}"
cursor = "${colors.cursor}"

[colors.selection]
text = "CellForeground"
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

function generateKittyConfig(colors: any): string {
  return `# Kitty color configuration
background ${colors.background}
foreground ${colors.foreground}
cursor ${colors.cursor}
selection_background ${colors.selection}
selection_foreground ${colors.foreground}

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

function generateIterm2Config(colors: any): string {
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    } : { r: 0, g: 0, b: 0 };
  };

  const colorToXml = (name: string, hex: string) => {
    const rgb = hexToRgb(hex);
    return `	<key>${name}</key>
	<dict>
		<key>Color Space</key>
		<string>sRGB</string>
		<key>Red Component</key>
		<real>${rgb.r}</real>
		<key>Green Component</key>
		<real>${rgb.g}</real>
		<key>Blue Component</key>
		<real>${rgb.b}</real>
	</dict>`;
  };

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
${colorToXml('Background Color', colors.background)}
${colorToXml('Foreground Color', colors.foreground)}
${colorToXml('Cursor Color', colors.cursor)}
${colorToXml('Selection Color', colors.selection)}
${colorToXml('Ansi 0 Color', colors.black)}
${colorToXml('Ansi 1 Color', colors.red)}
${colorToXml('Ansi 2 Color', colors.green)}
${colorToXml('Ansi 3 Color', colors.yellow)}
${colorToXml('Ansi 4 Color', colors.blue)}
${colorToXml('Ansi 5 Color', colors.magenta)}
${colorToXml('Ansi 6 Color', colors.cyan)}
${colorToXml('Ansi 7 Color', colors.white)}
${colorToXml('Ansi 8 Color', colors.brightBlack)}
${colorToXml('Ansi 9 Color', colors.brightRed)}
${colorToXml('Ansi 10 Color', colors.brightGreen)}
${colorToXml('Ansi 11 Color', colors.brightYellow)}
${colorToXml('Ansi 12 Color', colors.brightBlue)}
${colorToXml('Ansi 13 Color', colors.brightMagenta)}
${colorToXml('Ansi 14 Color', colors.brightCyan)}
${colorToXml('Ansi 15 Color', colors.brightWhite)}
</dict>
</plist>
`;
}

function generateWarpConfig(colors: any): string {
  return `# Warp theme configuration
background: "${colors.background}"
foreground: "${colors.foreground}"
details: darker
accent: "${colors.accent}"
terminal_colors:
  normal:
    black: "${colors.black}"
    red: "${colors.red}"
    green: "${colors.green}"
    yellow: "${colors.yellow}"
    blue: "${colors.blue}"
    magenta: "${colors.magenta}"
    cyan: "${colors.cyan}"
    white: "${colors.white}"
  bright:
    black: "${colors.brightBlack}"
    red: "${colors.brightRed}"
    green: "${colors.brightGreen}"
    yellow: "${colors.brightYellow}"
    blue: "${colors.brightBlue}"
    magenta: "${colors.brightMagenta}"
    cyan: "${colors.brightCyan}"
    white: "${colors.brightWhite}"
`;
}

function generateHyperConfig(colors: any): string {
  return `// Hyper theme configuration
module.exports = {
  backgroundColor: '${colors.background}',
  foregroundColor: '${colors.foreground}',
  cursorColor: '${colors.cursor}',
  cursorAccentColor: '${colors.background}',
  selectionColor: '${colors.selection}',
  borderColor: '${colors.border}',
  colors: {
    black: '${colors.black}',
    red: '${colors.red}',
    green: '${colors.green}',
    yellow: '${colors.yellow}',
    blue: '${colors.blue}',
    magenta: '${colors.magenta}',
    cyan: '${colors.cyan}',
    white: '${colors.white}',
    lightBlack: '${colors.brightBlack}',
    lightRed: '${colors.brightRed}',
    lightGreen: '${colors.brightGreen}',
    lightYellow: '${colors.brightYellow}',
    lightBlue: '${colors.brightBlue}',
    lightMagenta: '${colors.brightMagenta}',
    lightCyan: '${colors.brightCyan}',
    lightWhite: '${colors.brightWhite}',
  },
};
`;
}

function generateVSCodeConfig(colors: any): string {
  return `{
  "workbench.colorTheme": "Generated Theme",
  "workbench.colorCustomizations": {
    "editor.background": "${colors.background}",
    "editor.foreground": "${colors.foreground}",
    "editorCursor.foreground": "${colors.cursor}",
    "editor.selectionBackground": "${colors.selection}",
    "terminal.ansiBlack": "${colors.black}",
    "terminal.ansiRed": "${colors.red}",
    "terminal.ansiGreen": "${colors.green}",
    "terminal.ansiYellow": "${colors.yellow}",
    "terminal.ansiBlue": "${colors.blue}",
    "terminal.ansiMagenta": "${colors.magenta}",
    "terminal.ansiCyan": "${colors.cyan}",
    "terminal.ansiWhite": "${colors.white}",
    "terminal.ansiBrightBlack": "${colors.brightBlack}",
    "terminal.ansiBrightRed": "${colors.brightRed}",
    "terminal.ansiBrightGreen": "${colors.brightGreen}",
    "terminal.ansiBrightYellow": "${colors.brightYellow}",
    "terminal.ansiBrightBlue": "${colors.brightBlue}",
    "terminal.ansiBrightMagenta": "${colors.brightMagenta}",
    "terminal.ansiBrightCyan": "${colors.brightCyan}",
    "terminal.ansiBrightWhite": "${colors.brightWhite}"
  }
}
`;
}

function generateCursorConfig(colors: any): string {
  // Cursor is built on VS Code, so it uses the same configuration format
  // with additional AI-specific customizations if needed
  return `{
  "workbench.colorTheme": "Generated Theme",
  "workbench.colorCustomizations": {
    "editor.background": "${colors.background}",
    "editor.foreground": "${colors.foreground}",
    "editorCursor.foreground": "${colors.cursor}",
    "editor.selectionBackground": "${colors.selection}",
    "editorLineNumber.foreground": "${colors.brightBlack}",
    "editorLineNumber.activeForeground": "${colors.foreground}",
    "editor.lineHighlightBackground": "${colors.selection}",
    "editorIndentGuide.background1": "${colors.border}",
    "editorIndentGuide.activeBackground1": "${colors.brightBlack}",
    "sideBar.background": "${colors.background}",
    "sideBar.foreground": "${colors.foreground}",
    "sideBarTitle.foreground": "${colors.foreground}",
    "activityBar.background": "${colors.background}",
    "activityBar.foreground": "${colors.foreground}",
    "statusBar.background": "${colors.background}",
    "statusBar.foreground": "${colors.foreground}",
    "titleBar.activeBackground": "${colors.background}",
    "titleBar.activeForeground": "${colors.foreground}",
    "tab.activeBackground": "${colors.selection}",
    "tab.activeForeground": "${colors.foreground}",
    "tab.inactiveBackground": "${colors.background}",
    "tab.inactiveForeground": "${colors.brightBlack}",
    "terminal.background": "${colors.background}",
    "terminal.foreground": "${colors.foreground}",
    "terminalCursor.foreground": "${colors.cursor}",
    "terminal.ansiBlack": "${colors.black}",
    "terminal.ansiRed": "${colors.red}",
    "terminal.ansiGreen": "${colors.green}",
    "terminal.ansiYellow": "${colors.yellow}",
    "terminal.ansiBlue": "${colors.blue}",
    "terminal.ansiMagenta": "${colors.magenta}",
    "terminal.ansiCyan": "${colors.cyan}",
    "terminal.ansiWhite": "${colors.white}",
    "terminal.ansiBrightBlack": "${colors.brightBlack}",
    "terminal.ansiBrightRed": "${colors.brightRed}",
    "terminal.ansiBrightGreen": "${colors.brightGreen}",
    "terminal.ansiBrightYellow": "${colors.brightYellow}",
    "terminal.ansiBrightBlue": "${colors.brightBlue}",
    "terminal.ansiBrightMagenta": "${colors.brightMagenta}",
    "terminal.ansiBrightCyan": "${colors.brightCyan}",
    "terminal.ansiBrightWhite": "${colors.brightWhite}",
    "input.background": "${colors.selection}",
    "input.foreground": "${colors.foreground}",
    "input.border": "${colors.border}",
    "focusBorder": "${colors.accent}",
    "list.activeSelectionBackground": "${colors.selection}",
    "list.activeSelectionForeground": "${colors.foreground}",
    "list.hoverBackground": "${colors.selection}",
    "button.background": "${colors.accent}",
    "button.foreground": "${colors.background}",
    "badge.background": "${colors.accent}",
    "badge.foreground": "${colors.background}"
  }
}
`;
}

function generateNeovimConfig(colors: any): string {
  return `-- Neovim colorscheme configuration
vim.cmd([[
  hi Normal guibg=${colors.background} guifg=${colors.foreground}
  hi Cursor guibg=${colors.cursor}
  hi Visual guibg=${colors.selection}
  hi LineNr guifg=${colors.brightBlack}
  hi CursorLine guibg=${colors.selection}
  hi Comment guifg=${colors.brightBlack}
  hi String guifg=${colors.green}
  hi Function guifg=${colors.blue}
  hi Keyword guifg=${colors.magenta}
  hi Type guifg=${colors.yellow}
  hi Constant guifg=${colors.cyan}
]])
`;
}

function generateRaycastConfig(colors: any): string {
  return `{
  "name": "Custom Theme",
  "author": "MacTheme",
  "colors": {
    "background": "${colors.background}",
    "text": "${colors.foreground}",
    "selection": "${colors.selection}",
    "accent": "${colors.accent}"
  }
}
`;
}

function generateBatConfig(colors: any): string {
  return `# Bat theme configuration
--theme="MacTheme"
--style="numbers,changes,grid"
--color=always
`;
}

function generateDeltaConfig(colors: any): string {
  return `[delta]
    syntax-theme = MacTheme
    line-numbers = true
    side-by-side = true
    plus-style = "syntax ${colors.green}"
    minus-style = "syntax ${colors.red}"
    file-style = "${colors.yellow}"
    hunk-header-style = "syntax ${colors.blue}"
`;
}

function generateStarshipConfig(colors: any): string {
  return `# Starship prompt configuration
format = """
[┌───────────────────>](${colors.accent})
[│](${colors.accent})$directory$git_branch$git_status
[└─>](${colors.accent}) """

[directory]
style = "${colors.blue}"
truncation_length = 3
truncate_to_repo = true

[git_branch]
symbol = " "
style = "${colors.magenta}"

[git_status]
style = "${colors.red}"
`;
}

function generateZshConfig(colors: any): string {
  return `# Zsh syntax highlighting colors
ZSH_HIGHLIGHT_STYLES[default]='fg=${colors.foreground}'
ZSH_HIGHLIGHT_STYLES[unknown-token]='fg=${colors.red}'
ZSH_HIGHLIGHT_STYLES[reserved-word]='fg=${colors.magenta}'
ZSH_HIGHLIGHT_STYLES[alias]='fg=${colors.green}'
ZSH_HIGHLIGHT_STYLES[builtin]='fg=${colors.green}'
ZSH_HIGHLIGHT_STYLES[function]='fg=${colors.blue}'
ZSH_HIGHLIGHT_STYLES[command]='fg=${colors.green}'
ZSH_HIGHLIGHT_STYLES[precommand]='fg=${colors.cyan}'
ZSH_HIGHLIGHT_STYLES[commandseparator]='fg=${colors.foreground}'
ZSH_HIGHLIGHT_STYLES[path]='fg=${colors.yellow}'
ZSH_HIGHLIGHT_STYLES[globbing]='fg=${colors.magenta}'
ZSH_HIGHLIGHT_STYLES[single-quoted-argument]='fg=${colors.green}'
ZSH_HIGHLIGHT_STYLES[double-quoted-argument]='fg=${colors.green}'
`;
}

function generateWeztermConfig(colors: any): string {
  return `-- WezTerm color configuration
-- Add this to your wezterm.lua or require() this file
return {
  foreground = "${colors.foreground}",
  background = "${colors.background}",
  cursor_bg = "${colors.cursor}",
  cursor_fg = "${colors.background}",
  cursor_border = "${colors.cursor}",
  selection_bg = "${colors.selection}",
  selection_fg = "${colors.foreground}",
  scrollbar_thumb = "${colors.brightBlack}",
  split = "${colors.border}",

  ansi = {
    "${colors.black}",
    "${colors.red}",
    "${colors.green}",
    "${colors.yellow}",
    "${colors.blue}",
    "${colors.magenta}",
    "${colors.cyan}",
    "${colors.white}",
  },
  brights = {
    "${colors.brightBlack}",
    "${colors.brightRed}",
    "${colors.brightGreen}",
    "${colors.brightYellow}",
    "${colors.brightBlue}",
    "${colors.brightMagenta}",
    "${colors.brightCyan}",
    "${colors.brightWhite}",
  },

  tab_bar = {
    background = "${colors.background}",
    active_tab = {
      bg_color = "${colors.selection}",
      fg_color = "${colors.foreground}",
    },
    inactive_tab = {
      bg_color = "${colors.background}",
      fg_color = "${colors.brightBlack}",
    },
    inactive_tab_hover = {
      bg_color = "${colors.selection}",
      fg_color = "${colors.foreground}",
    },
    new_tab = {
      bg_color = "${colors.background}",
      fg_color = "${colors.brightBlack}",
    },
    new_tab_hover = {
      bg_color = "${colors.selection}",
      fg_color = "${colors.foreground}",
    },
  },
}
`;
}

function generateSketchybarConfig(colors: any): string {
  // Convert hex color to sketchybar's ARGB format (0xAARRGGBB)
  const toArgb = (hex: string) => {
    // Remove # if present
    const cleanHex = hex.replace('#', '');
    return `0xff${cleanHex}`;
  };

  return `#!/bin/bash
# SketchyBar color configuration
# Source this file in your sketchybarrc: source "$CONFIG_DIR/colors.sh"
# Generated by MacTheme

# Color Definitions
export COLOR_BACKGROUND="${toArgb(colors.background)}"
export COLOR_FOREGROUND="${toArgb(colors.foreground)}"
export COLOR_ACCENT="${toArgb(colors.accent)}"
export COLOR_SELECTION="${toArgb(colors.selection)}"
export COLOR_BORDER="${toArgb(colors.border)}"

# Bar colors
export BAR_COLOR="${toArgb(colors.background)}"
export BAR_BORDER_COLOR="${toArgb(colors.border)}"

# Item colors
export ITEM_BG_COLOR="${toArgb(colors.selection)}"
export ICON_COLOR="${toArgb(colors.accent)}"
export LABEL_COLOR="${toArgb(colors.foreground)}"

# ANSI colors
export COLOR_BLACK="${toArgb(colors.black)}"
export COLOR_RED="${toArgb(colors.red)}"
export COLOR_GREEN="${toArgb(colors.green)}"
export COLOR_YELLOW="${toArgb(colors.yellow)}"
export COLOR_BLUE="${toArgb(colors.blue)}"
export COLOR_MAGENTA="${toArgb(colors.magenta)}"
export COLOR_CYAN="${toArgb(colors.cyan)}"
export COLOR_WHITE="${toArgb(colors.white)}"

# Bright ANSI colors
export COLOR_BRIGHT_BLACK="${toArgb(colors.brightBlack)}"
export COLOR_BRIGHT_RED="${toArgb(colors.brightRed)}"
export COLOR_BRIGHT_GREEN="${toArgb(colors.brightGreen)}"
export COLOR_BRIGHT_YELLOW="${toArgb(colors.brightYellow)}"
export COLOR_BRIGHT_BLUE="${toArgb(colors.brightBlue)}"
export COLOR_BRIGHT_MAGENTA="${toArgb(colors.brightMagenta)}"
export COLOR_BRIGHT_CYAN="${toArgb(colors.brightCyan)}"
export COLOR_BRIGHT_WHITE="${toArgb(colors.brightWhite)}"

# Transparent variants (50% alpha)
export COLOR_TRANSPARENT="${toArgb(colors.background).replace('0xff', '0x80')}"
export COLOR_SEMI_TRANSPARENT="${toArgb(colors.background).replace('0xff', '0xcc')}"
`;
}

/**
 * Generate all config files for a theme in a directory
 * This is used by both theme creation and bundled theme generation
 */
export function generateThemeConfigFiles(themeDir: string, metadata: ThemeMetadata): void {
  // Create theme directory if it doesn't exist
  if (!fs.existsSync(themeDir)) {
    fs.mkdirSync(themeDir, { recursive: true });
  }

  // Write theme metadata
  fs.writeFileSync(path.join(themeDir, 'theme.json'), JSON.stringify(metadata, null, 2));

  // Generate all config files
  fs.writeFileSync(path.join(themeDir, 'alacritty.toml'), generateAlacrittyConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'kitty.conf'), generateKittyConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'iterm2.itermcolors'), generateIterm2Config(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'warp.yaml'), generateWarpConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'hyper.js'), generateHyperConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'wezterm.lua'), generateWeztermConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'vscode.json'), generateVSCodeConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'cursor.json'), generateCursorConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'neovim.lua'), generateNeovimConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'raycast.json'), generateRaycastConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'bat.conf'), generateBatConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'delta.gitconfig'), generateDeltaConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'starship.toml'), generateStarshipConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'zsh-theme.zsh'), generateZshConfig(metadata.colors));
  fs.writeFileSync(path.join(themeDir, 'sketchybar-colors.sh'), generateSketchybarConfig(metadata.colors));
}
