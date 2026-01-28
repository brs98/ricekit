import path from 'path';
import { getThemesDir } from './directories';
import { logger } from './logger';
import type { ThemeMetadata, ThemeColors } from '../shared/types';
import { blendColors } from '../shared/colorUtils';
import {
  ensureDir,
  writeJson,
  writeFile,
  readDir,
  isDirectory,
  existsSync,
  copyFile,
  copyDir,
} from './utils/asyncFs';

/**
 * Install bundled themes to the themes directory
 */
export async function installBundledThemes(): Promise<void> {
  const themesDir = getThemesDir();
  const bundledThemesDir = path.join(__dirname, '../../bundled-themes');

  logger.info('Installing bundled themes...');
  logger.info('Bundled themes dir:', bundledThemesDir);
  logger.info('Target themes dir:', themesDir);

  // Check if bundled themes directory exists and has complete themes (with theme.json)
  let hasBundledThemes = false;
  if (existsSync(bundledThemesDir)) {
    const themes = await readDir(bundledThemesDir);
    const completeThemesChecks = await Promise.all(
      themes.map(async (name) => {
        const themePath = path.join(bundledThemesDir, name);
        const themeJsonPath = path.join(themePath, 'theme.json');
        const isDir = await isDirectory(themePath);
        return isDir && existsSync(themeJsonPath);
      })
    );
    hasBundledThemes = completeThemesChecks.some(Boolean);
  }

  if (!hasBundledThemes) {
    logger.info('No bundled themes found, creating themes from templates...');
    await createThemesFromTemplates();
    return;
  }

  // Copy all bundled themes to themes directory
  const themes = await readDir(bundledThemesDir);
  for (const themeName of themes) {
    const srcPath = path.join(bundledThemesDir, themeName);
    const destPath = path.join(themesDir, themeName);

    // Skip if not a directory
    if (!(await isDirectory(srcPath))) {
      continue;
    }

    // Only install if theme doesn't already exist
    if (!existsSync(destPath)) {
      await copyDir(srcPath, destPath);
      logger.info(`Installed theme: ${themeName}`);
    } else {
      logger.info(`Theme already exists: ${themeName}`);
    }
  }

  logger.info('Bundled themes installation complete!');
}

/**
 * Create themes from code templates (fallback if bundled themes not found)
 * All 14 themes match Omarchy: https://github.com/basecamp/omarchy/tree/master/themes
 */
async function createThemesFromTemplates(): Promise<void> {
  const themesDir = getThemesDir();

  // Create all themes in parallel for better performance
  await Promise.all([
    createTokyoNightTheme(themesDir),
    createCatppuccinTheme(themesDir),
    createCatppuccinLatteTheme(themesDir),
    createEtherealTheme(themesDir),
    createEverforestTheme(themesDir),
    createFlexokiLightTheme(themesDir),
    createGruvboxTheme(themesDir),
    createHackermanTheme(themesDir),
    createKanagawaTheme(themesDir),
    createMatteBlackTheme(themesDir),
    createNordTheme(themesDir),
    createOsakaJadeTheme(themesDir),
    createRistrettoTheme(themesDir),
    createRosePineTheme(themesDir),
  ]);

  logger.info('Created all 14 bundled themes from templates');

  // Copy wallpapers from bundled-themes if available
  await copyBundledWallpapers(themesDir);
}

/**
 * Copy wallpapers from bundled-themes directory to created themes
 * This allows wallpapers to be distributed with the app without duplicating theme configs
 */
async function copyBundledWallpapers(themesDir: string): Promise<void> {
  const bundledThemesDir = path.join(__dirname, '../../bundled-themes');

  if (!existsSync(bundledThemesDir)) {
    logger.info('No bundled-themes directory found, skipping wallpaper copy');
    return;
  }

  const bundledThemes = await readDir(bundledThemesDir);
  for (const themeName of bundledThemes) {
    const bundledWallpapersDir = path.join(bundledThemesDir, themeName, 'wallpapers');

    if (!existsSync(bundledWallpapersDir)) {
      continue;
    }

    const destThemeDir = path.join(themesDir, themeName);
    if (!existsSync(destThemeDir)) {
      logger.info(`Theme ${themeName} not found in themes directory, skipping wallpaper copy`);
      continue;
    }

    const destWallpapersDir = path.join(destThemeDir, 'wallpapers');
    if (!existsSync(destWallpapersDir)) {
      await ensureDir(destWallpapersDir);
    }

    // Copy all wallpapers
    const wallpaperFiles = await readDir(bundledWallpapersDir);
    for (const file of wallpaperFiles) {
      const srcPath = path.join(bundledWallpapersDir, file);
      const destPath = path.join(destWallpapersDir, file);

      // Only copy if destination doesn't exist
      if (!existsSync(destPath)) {
        await copyFile(srcPath, destPath);
        logger.info(`Copied wallpaper: ${themeName}/${file}`);
      }
    }
  }

  logger.info('Finished copying bundled wallpapers');
}

async function createTokyoNightTheme(themesDir: string): Promise<void> {
  const themeDir = path.join(themesDir, 'tokyo-night');
  await ensureDir(themeDir);

  // Colors from Omarchy: https://github.com/basecamp/omarchy/tree/master/themes/tokyo-night
  const metadata = {
    name: 'Tokyo Night',
    author: 'enkia',
    description: 'A clean, dark theme inspired by the city lights of Tokyo at night',
    version: '1.0.0',
    colors: {
      background: '#1a1b26',
      foreground: '#a9b1d6',
      cursor: '#c0caf5',
      selection: '#7aa2f7',
      black: '#32344a',
      red: '#f7768e',
      green: '#9ece6a',
      yellow: '#e0af68',
      blue: '#7aa2f7',
      magenta: '#ad8ee6',
      cyan: '#449dab',
      white: '#787c99',
      brightBlack: '#444b6a',
      brightRed: '#ff7a93',
      brightGreen: '#b9f27c',
      brightYellow: '#ff9e64',
      brightBlue: '#7da6ff',
      brightMagenta: '#bb9af7',
      brightCyan: '#0db9d7',
      brightWhite: '#acb0d0',
      accent: '#7aa2f7',
      border: '#363b54',
    },
  };

  await writeJson(path.join(themeDir, 'theme.json'), metadata);

  await writeFile(path.join(themeDir, 'alacritty.toml'), generateAlacrittyConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'kitty.conf'), generateKittyConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'iterm2.itermcolors'), generateIterm2Config(metadata.colors));
  await writeFile(path.join(themeDir, 'warp.yaml'), generateWarpConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'hyper.js'), generateHyperConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'wezterm.lua'), generateWeztermConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'vscode.json'), generateVSCodeConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'cursor.json'), generateCursorConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'neovim.lua'), generateNeovimConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'raycast.json'), generateRaycastConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'bat.conf'), generateBatConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'delta.gitconfig'), generateDeltaConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'starship.toml'), generateStarshipConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'zsh-theme.zsh'), generateZshConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'sketchybar-colors.sh'), generateSketchybarConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'slack-theme.txt'), generateSlackConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'aerospace-borders.sh'), generateAerospaceBordersConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'tmux-colors.conf'), generateTmuxConfig(metadata.colors));
}

async function createCatppuccinTheme(themesDir: string): Promise<void> {
  const themeDir = path.join(themesDir, 'catppuccin');
  await ensureDir(themeDir);

  // Colors from Omarchy: https://github.com/basecamp/omarchy/tree/master/themes/catppuccin
  const metadata = {
    name: 'Catppuccin',
    author: 'Catppuccin',
    description: 'Soothing pastel theme for the high-spirited - Mocha variant',
    version: '1.0.0',
    colors: {
      background: '#1e1e2e',
      foreground: '#cdd6f4',
      cursor: '#f5e0dc',
      selection: '#f5e0dc',
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
      border: '#45475a',
    },
  };

  await writeJson(path.join(themeDir, 'theme.json'), metadata);
  await writeFile(path.join(themeDir, 'alacritty.toml'), generateAlacrittyConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'kitty.conf'), generateKittyConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'iterm2.itermcolors'), generateIterm2Config(metadata.colors));
  await writeFile(path.join(themeDir, 'warp.yaml'), generateWarpConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'hyper.js'), generateHyperConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'wezterm.lua'), generateWeztermConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'vscode.json'), generateVSCodeConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'cursor.json'), generateCursorConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'neovim.lua'), generateNeovimConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'raycast.json'), generateRaycastConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'bat.conf'), generateBatConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'delta.gitconfig'), generateDeltaConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'starship.toml'), generateStarshipConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'zsh-theme.zsh'), generateZshConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'sketchybar-colors.sh'), generateSketchybarConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'slack-theme.txt'), generateSlackConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'aerospace-borders.sh'), generateAerospaceBordersConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'tmux-colors.conf'), generateTmuxConfig(metadata.colors));
}

async function createCatppuccinLatteTheme(themesDir: string): Promise<void> {
  const themeDir = path.join(themesDir, 'catppuccin-latte');
  await ensureDir(themeDir);

  // Colors from Omarchy: https://github.com/basecamp/omarchy/tree/master/themes/catppuccin-latte
  const metadata = {
    name: 'Catppuccin Latte',
    author: 'Catppuccin',
    description: 'Soothing pastel theme for the high-spirited - Latte variant',
    version: '1.0.0',
    colors: {
      background: '#eff1f5',
      foreground: '#4c4f69',
      cursor: '#dc8a78',
      selection: '#dc8a78',
      black: '#bcc0cc',
      red: '#d20f39',
      green: '#40a02b',
      yellow: '#df8e1d',
      blue: '#1e66f5',
      magenta: '#ea76cb',
      cyan: '#179299',
      white: '#5c5f77',
      brightBlack: '#acb0be',
      brightRed: '#d20f39',
      brightGreen: '#40a02b',
      brightYellow: '#df8e1d',
      brightBlue: '#1e66f5',
      brightMagenta: '#ea76cb',
      brightCyan: '#179299',
      brightWhite: '#6c6f85',
      accent: '#1e66f5',
      border: '#ccd0da',
    },
  };

  await writeJson(path.join(themeDir, 'theme.json'), metadata);
  await writeFile(path.join(themeDir, 'light.mode'), ''); // Marker file for light theme
  await writeFile(path.join(themeDir, 'alacritty.toml'), generateAlacrittyConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'kitty.conf'), generateKittyConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'iterm2.itermcolors'), generateIterm2Config(metadata.colors));
  await writeFile(path.join(themeDir, 'warp.yaml'), generateWarpConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'hyper.js'), generateHyperConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'wezterm.lua'), generateWeztermConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'vscode.json'), generateVSCodeConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'cursor.json'), generateCursorConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'neovim.lua'), generateNeovimConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'raycast.json'), generateRaycastConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'bat.conf'), generateBatConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'delta.gitconfig'), generateDeltaConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'starship.toml'), generateStarshipConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'zsh-theme.zsh'), generateZshConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'sketchybar-colors.sh'), generateSketchybarConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'slack-theme.txt'), generateSlackConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'aerospace-borders.sh'), generateAerospaceBordersConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'tmux-colors.conf'), generateTmuxConfig(metadata.colors));
}

async function createGruvboxTheme(themesDir: string): Promise<void> {
  const themeDir = path.join(themesDir, 'gruvbox');
  await ensureDir(themeDir);

  // Colors from Omarchy: https://github.com/basecamp/omarchy/tree/master/themes/gruvbox
  const metadata = {
    name: 'Gruvbox',
    author: 'morhetz',
    description: 'Retro groove color scheme with earthy tones',
    version: '1.0.0',
    colors: {
      background: '#282828',
      foreground: '#d4be98',
      cursor: '#bdae93',
      selection: '#d65d0e',
      black: '#3c3836',
      red: '#ea6962',
      green: '#a9b665',
      yellow: '#d8a657',
      blue: '#7daea3',
      magenta: '#d3869b',
      cyan: '#89b482',
      white: '#d4be98',
      brightBlack: '#3c3836',
      brightRed: '#ea6962',
      brightGreen: '#a9b665',
      brightYellow: '#d8a657',
      brightBlue: '#7daea3',
      brightMagenta: '#d3869b',
      brightCyan: '#89b482',
      brightWhite: '#d4be98',
      accent: '#7daea3',
      border: '#3c3836',
    },
  };

  await writeJson(path.join(themeDir, 'theme.json'), metadata);
  await writeFile(path.join(themeDir, 'alacritty.toml'), generateAlacrittyConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'kitty.conf'), generateKittyConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'iterm2.itermcolors'), generateIterm2Config(metadata.colors));
  await writeFile(path.join(themeDir, 'warp.yaml'), generateWarpConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'hyper.js'), generateHyperConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'wezterm.lua'), generateWeztermConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'vscode.json'), generateVSCodeConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'cursor.json'), generateCursorConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'neovim.lua'), generateNeovimConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'raycast.json'), generateRaycastConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'bat.conf'), generateBatConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'delta.gitconfig'), generateDeltaConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'starship.toml'), generateStarshipConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'zsh-theme.zsh'), generateZshConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'sketchybar-colors.sh'), generateSketchybarConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'slack-theme.txt'), generateSlackConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'aerospace-borders.sh'), generateAerospaceBordersConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'tmux-colors.conf'), generateTmuxConfig(metadata.colors));
}

async function createNordTheme(themesDir: string): Promise<void> {
  const themeDir = path.join(themesDir, 'nord');
  await ensureDir(themeDir);

  // Colors from Omarchy: https://github.com/basecamp/omarchy/tree/master/themes/nord
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
      accent: '#81a1c1',
      border: '#4c566a',
    },
  };

  await writeJson(path.join(themeDir, 'theme.json'), metadata);
  await writeFile(path.join(themeDir, 'alacritty.toml'), generateAlacrittyConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'kitty.conf'), generateKittyConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'iterm2.itermcolors'), generateIterm2Config(metadata.colors));
  await writeFile(path.join(themeDir, 'warp.yaml'), generateWarpConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'hyper.js'), generateHyperConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'wezterm.lua'), generateWeztermConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'vscode.json'), generateVSCodeConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'cursor.json'), generateCursorConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'neovim.lua'), generateNeovimConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'raycast.json'), generateRaycastConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'bat.conf'), generateBatConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'delta.gitconfig'), generateDeltaConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'starship.toml'), generateStarshipConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'zsh-theme.zsh'), generateZshConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'sketchybar-colors.sh'), generateSketchybarConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'slack-theme.txt'), generateSlackConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'aerospace-borders.sh'), generateAerospaceBordersConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'tmux-colors.conf'), generateTmuxConfig(metadata.colors));
}

async function createRosePineTheme(themesDir: string): Promise<void> {
  const themeDir = path.join(themesDir, 'rose-pine');
  await ensureDir(themeDir);

  // Colors from Omarchy: https://github.com/basecamp/omarchy/tree/master/themes/rose-pine
  // This is the Dawn (light) variant
  const metadata = {
    name: 'Rosé Pine',
    author: 'Rosé Pine',
    description: 'All natural pine, faux fur and a bit of soho vibes - Dawn variant',
    version: '1.0.0',
    colors: {
      background: '#faf4ed',
      foreground: '#575279',
      cursor: '#cecacd',
      selection: '#dfdad9',
      black: '#f2e9e1',
      red: '#b4637a',
      green: '#286983',
      yellow: '#ea9d34',
      blue: '#56949f',
      magenta: '#907aa9',
      cyan: '#d7827e',
      white: '#575279',
      brightBlack: '#9893a5',
      brightRed: '#b4637a',
      brightGreen: '#286983',
      brightYellow: '#ea9d34',
      brightBlue: '#56949f',
      brightMagenta: '#907aa9',
      brightCyan: '#d7827e',
      brightWhite: '#575279',
      accent: '#56949f',
      border: '#f2e9e1',
    },
  };

  await writeJson(path.join(themeDir, 'theme.json'), metadata);
  await writeFile(path.join(themeDir, 'light.mode'), ''); // Marker file for light theme
  await writeFile(path.join(themeDir, 'alacritty.toml'), generateAlacrittyConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'kitty.conf'), generateKittyConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'iterm2.itermcolors'), generateIterm2Config(metadata.colors));
  await writeFile(path.join(themeDir, 'warp.yaml'), generateWarpConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'hyper.js'), generateHyperConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'wezterm.lua'), generateWeztermConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'vscode.json'), generateVSCodeConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'cursor.json'), generateCursorConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'neovim.lua'), generateNeovimConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'raycast.json'), generateRaycastConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'bat.conf'), generateBatConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'delta.gitconfig'), generateDeltaConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'starship.toml'), generateStarshipConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'zsh-theme.zsh'), generateZshConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'sketchybar-colors.sh'), generateSketchybarConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'slack-theme.txt'), generateSlackConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'aerospace-borders.sh'), generateAerospaceBordersConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'tmux-colors.conf'), generateTmuxConfig(metadata.colors));
}

async function createEtherealTheme(themesDir: string): Promise<void> {
  const themeDir = path.join(themesDir, 'ethereal');
  await ensureDir(themeDir);

  // Colors from Omarchy: https://github.com/basecamp/omarchy/tree/master/themes/ethereal
  const metadata = {
    name: 'Ethereal',
    author: 'Omarchy',
    description: 'A dreamy, atmospheric dark theme with warm peachy tones',
    version: '1.0.0',
    colors: {
      background: '#060B1E',
      foreground: '#ffcead',
      cursor: '#ffcead',
      selection: '#ffcead',
      black: '#060B1E',
      red: '#ED5B5A',
      green: '#92a593',
      yellow: '#E9BB4F',
      blue: '#7d82d9',
      magenta: '#c89dc1',
      cyan: '#a3bfd1',
      white: '#F99957',
      brightBlack: '#6d7db6',
      brightRed: '#faaaa9',
      brightGreen: '#c4cfc4',
      brightYellow: '#f7dc9c',
      brightBlue: '#c2c4f0',
      brightMagenta: '#ead7e7',
      brightCyan: '#dfeaf0',
      brightWhite: '#ffcead',
      accent: '#7d82d9',
      border: '#1a2040',
    },
  };

  await writeJson(path.join(themeDir, 'theme.json'), metadata);
  await writeFile(path.join(themeDir, 'alacritty.toml'), generateAlacrittyConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'kitty.conf'), generateKittyConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'iterm2.itermcolors'), generateIterm2Config(metadata.colors));
  await writeFile(path.join(themeDir, 'warp.yaml'), generateWarpConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'hyper.js'), generateHyperConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'wezterm.lua'), generateWeztermConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'vscode.json'), generateVSCodeConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'cursor.json'), generateCursorConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'neovim.lua'), generateNeovimConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'raycast.json'), generateRaycastConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'bat.conf'), generateBatConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'delta.gitconfig'), generateDeltaConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'starship.toml'), generateStarshipConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'zsh-theme.zsh'), generateZshConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'sketchybar-colors.sh'), generateSketchybarConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'slack-theme.txt'), generateSlackConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'aerospace-borders.sh'), generateAerospaceBordersConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'tmux-colors.conf'), generateTmuxConfig(metadata.colors));
}

async function createEverforestTheme(themesDir: string): Promise<void> {
  const themeDir = path.join(themesDir, 'everforest');
  await ensureDir(themeDir);

  // Colors from Omarchy: https://github.com/basecamp/omarchy/tree/master/themes/everforest
  const metadata = {
    name: 'Everforest',
    author: 'sainnhe',
    description: 'A green-based comfortable and eye-friendly color scheme',
    version: '1.0.0',
    colors: {
      background: '#2d353b',
      foreground: '#d3c6aa',
      cursor: '#d3c6aa',
      selection: '#d3c6aa',
      black: '#475258',
      red: '#e67e80',
      green: '#a7c080',
      yellow: '#dbbc7f',
      blue: '#7fbbb3',
      magenta: '#d699b6',
      cyan: '#83c092',
      white: '#d3c6aa',
      brightBlack: '#475258',
      brightRed: '#e67e80',
      brightGreen: '#a7c080',
      brightYellow: '#dbbc7f',
      brightBlue: '#7fbbb3',
      brightMagenta: '#d699b6',
      brightCyan: '#83c092',
      brightWhite: '#d3c6aa',
      accent: '#7fbbb3',
      border: '#3d484d',
    },
  };

  await writeJson(path.join(themeDir, 'theme.json'), metadata);
  await writeFile(path.join(themeDir, 'alacritty.toml'), generateAlacrittyConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'kitty.conf'), generateKittyConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'iterm2.itermcolors'), generateIterm2Config(metadata.colors));
  await writeFile(path.join(themeDir, 'warp.yaml'), generateWarpConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'hyper.js'), generateHyperConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'wezterm.lua'), generateWeztermConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'vscode.json'), generateVSCodeConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'cursor.json'), generateCursorConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'neovim.lua'), generateNeovimConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'raycast.json'), generateRaycastConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'bat.conf'), generateBatConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'delta.gitconfig'), generateDeltaConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'starship.toml'), generateStarshipConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'zsh-theme.zsh'), generateZshConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'sketchybar-colors.sh'), generateSketchybarConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'slack-theme.txt'), generateSlackConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'aerospace-borders.sh'), generateAerospaceBordersConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'tmux-colors.conf'), generateTmuxConfig(metadata.colors));
}

async function createFlexokiLightTheme(themesDir: string): Promise<void> {
  const themeDir = path.join(themesDir, 'flexoki-light');
  await ensureDir(themeDir);

  // Colors from Omarchy: https://github.com/basecamp/omarchy/tree/master/themes/flexoki-light
  const metadata = {
    name: 'Flexoki Light',
    author: 'Steph Ango',
    description: 'An inky color scheme for prose and code',
    version: '1.0.0',
    colors: {
      background: '#FFFCF0',
      foreground: '#100F0F',
      cursor: '#100F0F',
      selection: '#CECDC3',
      black: '#100F0F',
      red: '#D14D41',
      green: '#879A39',
      yellow: '#D0A215',
      blue: '#205EA6',
      magenta: '#CE5D97',
      cyan: '#3AA99F',
      white: '#FFFCF0',
      brightBlack: '#100F0F',
      brightRed: '#D14D41',
      brightGreen: '#879A39',
      brightYellow: '#D0A215',
      brightBlue: '#4385BE',
      brightMagenta: '#CE5D97',
      brightCyan: '#3AA99F',
      brightWhite: '#FFFCF0',
      accent: '#205EA6',
      border: '#E6E4D9',
    },
  };

  await writeJson(path.join(themeDir, 'theme.json'), metadata);
  await writeFile(path.join(themeDir, 'light.mode'), ''); // Marker file for light theme
  await writeFile(path.join(themeDir, 'alacritty.toml'), generateAlacrittyConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'kitty.conf'), generateKittyConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'iterm2.itermcolors'), generateIterm2Config(metadata.colors));
  await writeFile(path.join(themeDir, 'warp.yaml'), generateWarpConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'hyper.js'), generateHyperConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'wezterm.lua'), generateWeztermConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'vscode.json'), generateVSCodeConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'cursor.json'), generateCursorConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'neovim.lua'), generateNeovimConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'raycast.json'), generateRaycastConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'bat.conf'), generateBatConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'delta.gitconfig'), generateDeltaConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'starship.toml'), generateStarshipConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'zsh-theme.zsh'), generateZshConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'sketchybar-colors.sh'), generateSketchybarConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'slack-theme.txt'), generateSlackConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'aerospace-borders.sh'), generateAerospaceBordersConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'tmux-colors.conf'), generateTmuxConfig(metadata.colors));
}

async function createHackermanTheme(themesDir: string): Promise<void> {
  const themeDir = path.join(themesDir, 'hackerman');
  await ensureDir(themeDir);

  // Colors from Omarchy: https://github.com/basecamp/omarchy/tree/master/themes/hackerman
  const metadata = {
    name: 'Hackerman',
    author: 'Omarchy',
    description: 'A green-tinted cyberpunk hacker theme',
    version: '1.0.0',
    colors: {
      background: '#0B0C16',
      foreground: '#ddf7ff',
      cursor: '#ddf7ff',
      selection: '#ddf7ff',
      black: '#0B0C16',
      red: '#50f872',
      green: '#4fe88f',
      yellow: '#50f7d4',
      blue: '#829dd4',
      magenta: '#86a7df',
      cyan: '#7cf8f7',
      white: '#85E1FB',
      brightBlack: '#6a6e95',
      brightRed: '#85ff9d',
      brightGreen: '#9cf7c2',
      brightYellow: '#a4ffec',
      brightBlue: '#c4d2ed',
      brightMagenta: '#cddbf4',
      brightCyan: '#d1fffe',
      brightWhite: '#ddf7ff',
      accent: '#82FB9C',
      border: '#1a1c2a',
    },
  };

  await writeJson(path.join(themeDir, 'theme.json'), metadata);
  await writeFile(path.join(themeDir, 'alacritty.toml'), generateAlacrittyConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'kitty.conf'), generateKittyConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'iterm2.itermcolors'), generateIterm2Config(metadata.colors));
  await writeFile(path.join(themeDir, 'warp.yaml'), generateWarpConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'hyper.js'), generateHyperConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'wezterm.lua'), generateWeztermConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'vscode.json'), generateVSCodeConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'cursor.json'), generateCursorConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'neovim.lua'), generateNeovimConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'raycast.json'), generateRaycastConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'bat.conf'), generateBatConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'delta.gitconfig'), generateDeltaConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'starship.toml'), generateStarshipConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'zsh-theme.zsh'), generateZshConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'sketchybar-colors.sh'), generateSketchybarConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'slack-theme.txt'), generateSlackConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'aerospace-borders.sh'), generateAerospaceBordersConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'tmux-colors.conf'), generateTmuxConfig(metadata.colors));
}

async function createKanagawaTheme(themesDir: string): Promise<void> {
  const themeDir = path.join(themesDir, 'kanagawa');
  await ensureDir(themeDir);

  // Colors from Omarchy: https://github.com/basecamp/omarchy/tree/master/themes/kanagawa
  const metadata = {
    name: 'Kanagawa',
    author: 'rebelot',
    description: 'A dark color scheme inspired by the famous painting by Katsushika Hokusai',
    version: '1.0.0',
    colors: {
      background: '#1f1f28',
      foreground: '#dcd7ba',
      cursor: '#c8c093',
      selection: '#2d4f67',
      black: '#090618',
      red: '#c34043',
      green: '#76946a',
      yellow: '#c0a36e',
      blue: '#7e9cd8',
      magenta: '#957fb8',
      cyan: '#6a9589',
      white: '#c8c093',
      brightBlack: '#727169',
      brightRed: '#e82424',
      brightGreen: '#98bb6c',
      brightYellow: '#e6c384',
      brightBlue: '#7fb4ca',
      brightMagenta: '#938aa9',
      brightCyan: '#7aa89f',
      brightWhite: '#dcd7ba',
      accent: '#7e9cd8',
      border: '#2a2a37',
    },
  };

  await writeJson(path.join(themeDir, 'theme.json'), metadata);
  await writeFile(path.join(themeDir, 'alacritty.toml'), generateAlacrittyConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'kitty.conf'), generateKittyConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'iterm2.itermcolors'), generateIterm2Config(metadata.colors));
  await writeFile(path.join(themeDir, 'warp.yaml'), generateWarpConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'hyper.js'), generateHyperConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'wezterm.lua'), generateWeztermConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'vscode.json'), generateVSCodeConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'cursor.json'), generateCursorConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'neovim.lua'), generateNeovimConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'raycast.json'), generateRaycastConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'bat.conf'), generateBatConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'delta.gitconfig'), generateDeltaConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'starship.toml'), generateStarshipConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'zsh-theme.zsh'), generateZshConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'sketchybar-colors.sh'), generateSketchybarConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'slack-theme.txt'), generateSlackConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'aerospace-borders.sh'), generateAerospaceBordersConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'tmux-colors.conf'), generateTmuxConfig(metadata.colors));
}

async function createMatteBlackTheme(themesDir: string): Promise<void> {
  const themeDir = path.join(themesDir, 'matte-black');
  await ensureDir(themeDir);

  // Colors from Omarchy: https://github.com/basecamp/omarchy/tree/master/themes/matte-black
  const metadata = {
    name: 'Matte Black',
    author: 'Omarchy',
    description: 'A sleek, minimal dark theme with amber accents',
    version: '1.0.0',
    colors: {
      background: '#121212',
      foreground: '#bebebe',
      cursor: '#eaeaea',
      selection: '#333333',
      black: '#333333',
      red: '#D35F5F',
      green: '#FFC107',
      yellow: '#b91c1c',
      blue: '#e68e0d',
      magenta: '#D35F5F',
      cyan: '#bebebe',
      white: '#bebebe',
      brightBlack: '#8a8a8d',
      brightRed: '#B91C1C',
      brightGreen: '#FFC107',
      brightYellow: '#b90a0a',
      brightBlue: '#f59e0b',
      brightMagenta: '#B91C1C',
      brightCyan: '#eaeaea',
      brightWhite: '#ffffff',
      accent: '#e68e0d',
      border: '#2a2a2a',
    },
  };

  await writeJson(path.join(themeDir, 'theme.json'), metadata);
  await writeFile(path.join(themeDir, 'alacritty.toml'), generateAlacrittyConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'kitty.conf'), generateKittyConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'iterm2.itermcolors'), generateIterm2Config(metadata.colors));
  await writeFile(path.join(themeDir, 'warp.yaml'), generateWarpConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'hyper.js'), generateHyperConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'wezterm.lua'), generateWeztermConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'vscode.json'), generateVSCodeConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'cursor.json'), generateCursorConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'neovim.lua'), generateNeovimConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'raycast.json'), generateRaycastConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'bat.conf'), generateBatConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'delta.gitconfig'), generateDeltaConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'starship.toml'), generateStarshipConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'zsh-theme.zsh'), generateZshConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'sketchybar-colors.sh'), generateSketchybarConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'slack-theme.txt'), generateSlackConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'aerospace-borders.sh'), generateAerospaceBordersConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'tmux-colors.conf'), generateTmuxConfig(metadata.colors));
}

async function createOsakaJadeTheme(themesDir: string): Promise<void> {
  const themeDir = path.join(themesDir, 'osaka-jade');
  await ensureDir(themeDir);

  // Colors from Omarchy: https://github.com/basecamp/omarchy/tree/master/themes/osaka-jade
  const metadata = {
    name: 'Osaka Jade',
    author: 'Omarchy',
    description: 'A deep green theme inspired by Japanese jade',
    version: '1.0.0',
    colors: {
      background: '#111c18',
      foreground: '#C1C497',
      cursor: '#D7C995',
      selection: '#C1C497',
      black: '#23372B',
      red: '#FF5345',
      green: '#549e6a',
      yellow: '#459451',
      blue: '#509475',
      magenta: '#D2689C',
      cyan: '#2DD5B7',
      white: '#F6F5DD',
      brightBlack: '#53685B',
      brightRed: '#db9f9c',
      brightGreen: '#63b07a',
      brightYellow: '#E5C736',
      brightBlue: '#ACD4CF',
      brightMagenta: '#75bbb3',
      brightCyan: '#8CD3CB',
      brightWhite: '#9eebb3',
      accent: '#509475',
      border: '#1e3028',
    },
  };

  await writeJson(path.join(themeDir, 'theme.json'), metadata);
  await writeFile(path.join(themeDir, 'alacritty.toml'), generateAlacrittyConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'kitty.conf'), generateKittyConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'iterm2.itermcolors'), generateIterm2Config(metadata.colors));
  await writeFile(path.join(themeDir, 'warp.yaml'), generateWarpConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'hyper.js'), generateHyperConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'wezterm.lua'), generateWeztermConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'vscode.json'), generateVSCodeConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'cursor.json'), generateCursorConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'neovim.lua'), generateNeovimConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'raycast.json'), generateRaycastConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'bat.conf'), generateBatConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'delta.gitconfig'), generateDeltaConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'starship.toml'), generateStarshipConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'zsh-theme.zsh'), generateZshConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'sketchybar-colors.sh'), generateSketchybarConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'slack-theme.txt'), generateSlackConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'aerospace-borders.sh'), generateAerospaceBordersConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'tmux-colors.conf'), generateTmuxConfig(metadata.colors));
}

async function createRistrettoTheme(themesDir: string): Promise<void> {
  const themeDir = path.join(themesDir, 'ristretto');
  await ensureDir(themeDir);

  // Colors from Omarchy: https://github.com/basecamp/omarchy/tree/master/themes/ristretto
  const metadata = {
    name: 'Ristretto',
    author: 'Monokai',
    description: 'A warm, coffee-inspired dark theme',
    version: '1.0.0',
    colors: {
      background: '#2c2525',
      foreground: '#e6d9db',
      cursor: '#c3b7b8',
      selection: '#403e41',
      black: '#72696a',
      red: '#fd6883',
      green: '#adda78',
      yellow: '#f9cc6c',
      blue: '#f38d70',
      magenta: '#a8a9eb',
      cyan: '#85dacc',
      white: '#e6d9db',
      brightBlack: '#948a8b',
      brightRed: '#ff8297',
      brightGreen: '#c8e292',
      brightYellow: '#fcd675',
      brightBlue: '#f8a788',
      brightMagenta: '#bebffd',
      brightCyan: '#9bf1e1',
      brightWhite: '#f1e5e7',
      accent: '#f38d70',
      border: '#3d3536',
    },
  };

  await writeJson(path.join(themeDir, 'theme.json'), metadata);
  await writeFile(path.join(themeDir, 'alacritty.toml'), generateAlacrittyConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'kitty.conf'), generateKittyConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'iterm2.itermcolors'), generateIterm2Config(metadata.colors));
  await writeFile(path.join(themeDir, 'warp.yaml'), generateWarpConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'hyper.js'), generateHyperConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'wezterm.lua'), generateWeztermConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'vscode.json'), generateVSCodeConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'cursor.json'), generateCursorConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'neovim.lua'), generateNeovimConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'raycast.json'), generateRaycastConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'bat.conf'), generateBatConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'delta.gitconfig'), generateDeltaConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'starship.toml'), generateStarshipConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'zsh-theme.zsh'), generateZshConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'sketchybar-colors.sh'), generateSketchybarConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'slack-theme.txt'), generateSlackConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'aerospace-borders.sh'), generateAerospaceBordersConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'tmux-colors.conf'), generateTmuxConfig(metadata.colors));
}

// Config generators
function generateAlacrittyConfig(colors: ThemeColors): string {
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

function generateKittyConfig(colors: ThemeColors): string {
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

function generateIterm2Config(colors: ThemeColors): string {
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1] ?? '0', 16) / 255,
      g: parseInt(result[2] ?? '0', 16) / 255,
      b: parseInt(result[3] ?? '0', 16) / 255
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

function generateWarpConfig(colors: ThemeColors): string {
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

function generateHyperConfig(colors: ThemeColors): string {
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

function generateVSCodeConfig(colors: ThemeColors): string {
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

function generateCursorConfig(colors: ThemeColors): string {
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

function generateNeovimConfig(colors: ThemeColors): string {
  // Calculate a subtle cursorline color by blending 5% toward the foreground
  // This creates a barely-visible highlight that doesn't distract from content
  const cursorLineColor = blendColors(colors.background, colors.foreground, 0.05) ?? colors.background;

  return `-- Neovim colorscheme configuration
vim.cmd([[
  hi Normal guibg=${colors.background} guifg=${colors.foreground}
  hi Cursor guibg=${colors.cursor}
  hi Visual guibg=${colors.selection}
  hi LineNr guifg=${colors.brightBlack}
  hi CursorLine guibg=${cursorLineColor}
  hi CursorLineNr guifg=${colors.foreground} guibg=${cursorLineColor}
  hi Comment guifg=${colors.brightBlack}
  hi String guifg=${colors.green}
  hi Function guifg=${colors.blue}
  hi Keyword guifg=${colors.magenta}
  hi Type guifg=${colors.yellow}
  hi Constant guifg=${colors.cyan}
]])
`;
}

function generateRaycastConfig(colors: ThemeColors): string {
  return `{
  "name": "Custom Theme",
  "author": "Flowstate",
  "colors": {
    "background": "${colors.background}",
    "text": "${colors.foreground}",
    "selection": "${colors.selection}",
    "accent": "${colors.accent}"
  }
}
`;
}

function generateBatConfig(_colors: ThemeColors): string {
  return `# Bat theme configuration
--theme="Flowstate"
--style="numbers,changes,grid"
--color=always
`;
}

function generateDeltaConfig(colors: ThemeColors): string {
  return `[delta]
    syntax-theme = Flowstate
    line-numbers = true
    side-by-side = true
    plus-style = "syntax ${colors.green}"
    minus-style = "syntax ${colors.red}"
    file-style = "${colors.yellow}"
    hunk-header-style = "syntax ${colors.blue}"
`;
}

function generateStarshipConfig(colors: ThemeColors): string {
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

function generateZshConfig(colors: ThemeColors): string {
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

function generateWeztermConfig(colors: ThemeColors): string {
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
      fg_color = "${colors.background}",
    },
    inactive_tab = {
      bg_color = "${colors.background}",
      fg_color = "${colors.brightBlack}",
    },
    inactive_tab_hover = {
      bg_color = "${colors.selection}",
      fg_color = "${colors.background}",
    },
    new_tab = {
      bg_color = "${colors.background}",
      fg_color = "${colors.brightBlack}",
    },
    new_tab_hover = {
      bg_color = "${colors.selection}",
      fg_color = "${colors.background}",
    },
  },
}
`;
}

function generateSketchybarConfig(colors: ThemeColors): string {
  // Convert hex color to sketchybar's ARGB format (0xAARRGGBB)
  const toArgb = (hex: string) => {
    // Remove # if present
    const cleanHex = hex.replace('#', '');
    return `0xff${cleanHex}`;
  };

  return `#!/bin/bash
# SketchyBar color configuration
# Source this file in your sketchybarrc: source "$CONFIG_DIR/colors.sh"
# Generated by Flowstate

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

function generateSlackConfig(colors: ThemeColors): string {
  // Slack sidebar theme format:
  // Column Background, Menu Background Hover, Active Item, Active Item Text,
  // Hover Item, Text Color, Active Presence, Mention Badge
  //
  // To apply in Slack:
  // 1. Go to Preferences → Sidebar → Theme
  // 2. Click "Create a custom theme" at the bottom
  // 3. Paste the theme string

  const columnBg = colors.background;
  const menuBgHover = colors.selection;
  const activeItem = colors.accent;
  const activeItemText = colors.background;
  const hoverItem = colors.selection;
  const textColor = colors.foreground;
  const activePresence = colors.green;
  const mentionBadge = colors.red;

  const themeString = `${columnBg},${menuBgHover},${activeItem},${activeItemText},${hoverItem},${textColor},${activePresence},${mentionBadge}`;

  return `# Slack Sidebar Theme
# Generated by Flowstate
#
# To apply this theme in Slack:
# 1. Open Slack Preferences (Cmd+,)
# 2. Go to Themes in the sidebar
# 3. Scroll down and click "Create a custom theme"
# 4. Copy and paste the theme string below into the input field
# 5. Click "Apply" or the theme will apply automatically
#
# Theme String (copy this line):
${themeString}

# Color breakdown:
# Column Background:    ${columnBg}
# Menu Background Hover: ${menuBgHover}
# Active Item:          ${activeItem}
# Active Item Text:     ${activeItemText}
# Hover Item:           ${hoverItem}
# Text Color:           ${textColor}
# Active Presence:      ${activePresence}
# Mention Badge:        ${mentionBadge}

# Alternative formats for different Slack versions:
# 
# Legacy format (4 colors):
# ${columnBg},${colors.border},${textColor},${activeItem}
#
# If the 8-color format doesn't work, try the legacy format above.
`;
}

function generateAerospaceBordersConfig(colors: ThemeColors): string {
  // Convert hex color to ARGB format for JankyBorders (0xAARRGGBB)
  const toArgb = (hex: string) => {
    // Remove # if present
    const cleanHex = hex.replace('#', '');
    return `0xff${cleanHex}`;
  };

  // Use accent color for active border and a muted color for inactive
  const activeColor = toArgb(colors.accent);
  const inactiveColor = toArgb(colors.border || colors.brightBlack);

  return `#!/bin/bash
# AeroSpace/JankyBorders color configuration
# Generated by Flowstate
#
# This script configures JankyBorders to display themed window borders
# JankyBorders must be installed: brew install FelixKratz/formulae/borders
#
# Usage in aerospace.toml:
# after-startup-command = [
#   'exec-and-forget source "$HOME/Library/Application Support/Flowstate/current/theme/aerospace-borders.sh"'
# ]

# Color values (ARGB format: 0xAARRGGBB)
ACTIVE_COLOR="${activeColor}"
INACTIVE_COLOR="${inactiveColor}"
BORDER_WIDTH="5.0"

# Kill any existing borders process to allow theme updates without restart
pkill -x borders 2>/dev/null || true

# Small delay to ensure clean shutdown
sleep 0.2

# Find borders binary (check common Homebrew locations)
BORDERS_BIN=""
if [ -x "/opt/homebrew/bin/borders" ]; then
  BORDERS_BIN="/opt/homebrew/bin/borders"
elif [ -x "/usr/local/bin/borders" ]; then
  BORDERS_BIN="/usr/local/bin/borders"
elif command -v borders >/dev/null 2>&1; then
  BORDERS_BIN="borders"
fi

# Start borders with theme colors if found
if [ -n "$BORDERS_BIN" ]; then
  nohup "$BORDERS_BIN" active_color="$ACTIVE_COLOR" inactive_color="$INACTIVE_COLOR" width="$BORDER_WIDTH" >/dev/null 2>&1 &
  disown
fi
`;
}

function generateTmuxConfig(colors: ThemeColors): string {
  return `# tmux theme colors
# Generated by Flowstate
#
# Source this file in your .tmux.conf:
# source-file "~/Library/Application Support/Flowstate/current/theme/tmux-colors.conf"
#
# Use colors with: #{@variablename}
# Example: set -g status-style "bg=#{@background}"

# Base colors
set -g @background "${colors.background}"
set -g @foreground "${colors.foreground}"
set -g @selection "${colors.selection}"
set -g @accent "${colors.accent}"
set -g @border "${colors.border}"
set -g @cursor "${colors.cursor}"

# ANSI colors
set -g @black "${colors.black}"
set -g @red "${colors.red}"
set -g @green "${colors.green}"
set -g @yellow "${colors.yellow}"
set -g @blue "${colors.blue}"
set -g @magenta "${colors.magenta}"
set -g @cyan "${colors.cyan}"
set -g @white "${colors.white}"

# Bright ANSI colors
set -g @brightBlack "${colors.brightBlack}"
set -g @brightRed "${colors.brightRed}"
set -g @brightGreen "${colors.brightGreen}"
set -g @brightYellow "${colors.brightYellow}"
set -g @brightBlue "${colors.brightBlue}"
set -g @brightMagenta "${colors.brightMagenta}"
set -g @brightCyan "${colors.brightCyan}"
set -g @brightWhite "${colors.brightWhite}"
`;
}

/**
 * Generate all config files for a theme in a directory
 * This is used by both theme creation and bundled theme generation
 */
export async function generateThemeConfigFiles(themeDir: string, metadata: ThemeMetadata): Promise<void> {
  // Create theme directory if it doesn't exist
  if (!existsSync(themeDir)) {
    await ensureDir(themeDir);
  }

  // Write theme metadata
  await writeJson(path.join(themeDir, 'theme.json'), metadata);

  // Generate all config files
  await writeFile(path.join(themeDir, 'alacritty.toml'), generateAlacrittyConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'kitty.conf'), generateKittyConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'iterm2.itermcolors'), generateIterm2Config(metadata.colors));
  await writeFile(path.join(themeDir, 'warp.yaml'), generateWarpConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'hyper.js'), generateHyperConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'wezterm.lua'), generateWeztermConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'vscode.json'), generateVSCodeConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'cursor.json'), generateCursorConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'neovim.lua'), generateNeovimConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'raycast.json'), generateRaycastConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'bat.conf'), generateBatConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'delta.gitconfig'), generateDeltaConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'starship.toml'), generateStarshipConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'zsh-theme.zsh'), generateZshConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'sketchybar-colors.sh'), generateSketchybarConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'slack-theme.txt'), generateSlackConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'aerospace-borders.sh'), generateAerospaceBordersConfig(metadata.colors));
  await writeFile(path.join(themeDir, 'tmux-colors.conf'), generateTmuxConfig(metadata.colors));
}
