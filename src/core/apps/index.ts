/**
 * App detection operations
 */

import path from 'path';
import os from 'os';
import type { AppInfo } from '../../shared/types';
import { existsSync } from '../utils/fs';

/**
 * App definitions for detection
 */
const APP_DEFINITIONS = [
  // Terminals
  {
    name: 'alacritty',
    displayName: 'Alacritty',
    category: 'terminal' as const,
    paths: ['/Applications/Alacritty.app', path.join(os.homedir(), 'Applications', 'Alacritty.app')],
    configPath: path.join(os.homedir(), '.config', 'alacritty', 'alacritty.toml'),
  },
  {
    name: 'kitty',
    displayName: 'Kitty',
    category: 'terminal' as const,
    paths: ['/Applications/kitty.app', path.join(os.homedir(), 'Applications', 'kitty.app')],
    configPath: path.join(os.homedir(), '.config', 'kitty', 'kitty.conf'),
  },
  {
    name: 'iterm2',
    displayName: 'iTerm2',
    category: 'terminal' as const,
    paths: ['/Applications/iTerm.app', path.join(os.homedir(), 'Applications', 'iTerm.app')],
    configPath: path.join(os.homedir(), 'Library', 'Preferences', 'com.googlecode.iterm2.plist'),
  },
  {
    name: 'warp',
    displayName: 'Warp',
    category: 'terminal' as const,
    paths: ['/Applications/Warp.app', path.join(os.homedir(), 'Applications', 'Warp.app')],
    configPath: path.join(os.homedir(), '.warp', 'themes'),
  },
  {
    name: 'wezterm',
    displayName: 'WezTerm',
    category: 'terminal' as const,
    paths: ['/Applications/WezTerm.app', path.join(os.homedir(), 'Applications', 'WezTerm.app')],
    configPath: path.join(os.homedir(), '.config', 'wezterm', 'wezterm.lua'),
  },

  // Editors
  {
    name: 'vscode',
    displayName: 'Visual Studio Code',
    category: 'editor' as const,
    paths: [
      '/Applications/Visual Studio Code.app',
      path.join(os.homedir(), 'Applications', 'Visual Studio Code.app'),
    ],
    configPath: path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User', 'settings.json'),
  },
  {
    name: 'cursor',
    displayName: 'Cursor',
    category: 'editor' as const,
    paths: ['/Applications/Cursor.app', path.join(os.homedir(), 'Applications', 'Cursor.app')],
    configPath: path.join(os.homedir(), 'Library', 'Application Support', 'Cursor', 'User', 'settings.json'),
  },
  {
    name: 'neovim',
    displayName: 'Neovim',
    category: 'editor' as const,
    paths: ['/usr/local/bin/nvim', '/opt/homebrew/bin/nvim'],
    configPath: path.join(os.homedir(), '.config', 'nvim'),
  },

  // CLI Tools
  {
    name: 'bat',
    displayName: 'bat',
    category: 'cli' as const,
    paths: ['/usr/local/bin/bat', '/opt/homebrew/bin/bat'],
    configPath: path.join(os.homedir(), '.config', 'bat', 'config'),
  },
  {
    name: 'starship',
    displayName: 'Starship',
    category: 'cli' as const,
    paths: ['/usr/local/bin/starship', '/opt/homebrew/bin/starship'],
    configPath: path.join(os.homedir(), '.config', 'starship.toml'),
  },
  {
    name: 'sketchybar',
    displayName: 'SketchyBar',
    category: 'system' as const,
    paths: ['/usr/local/bin/sketchybar', '/opt/homebrew/bin/sketchybar'],
    configPath: path.join(os.homedir(), '.config', 'sketchybar', 'sketchybarrc'),
  },

  // Launchers
  {
    name: 'raycast',
    displayName: 'Raycast',
    category: 'launcher' as const,
    paths: ['/Applications/Raycast.app', path.join(os.homedir(), 'Applications', 'Raycast.app')],
    configPath: path.join(os.homedir(), 'Library', 'Application Support', 'Raycast'),
  },

  // Tiling Managers
  {
    name: 'aerospace',
    displayName: 'AeroSpace',
    category: 'tiling' as const,
    paths: [
      '/Applications/AeroSpace.app',
      path.join(os.homedir(), 'Applications', 'AeroSpace.app'),
      '/opt/homebrew/bin/aerospace',
      '/usr/local/bin/aerospace',
    ],
    configPath: path.join(os.homedir(), '.config', 'aerospace', 'aerospace.toml'),
  },
];

/**
 * Detect installed applications
 */
export function detectApps(): AppInfo[] {
  return APP_DEFINITIONS.map((app) => {
    const isInstalled = app.paths.some((p) => existsSync(p));
    const isConfigured = existsSync(app.configPath);

    return {
      name: app.name,
      displayName: app.displayName,
      category: app.category,
      isInstalled,
      isConfigured: isInstalled && isConfigured,
      configPath: app.configPath,
    };
  });
}

/**
 * Get installed apps only
 */
export function getInstalledApps(): AppInfo[] {
  return detectApps().filter((app) => app.isInstalled);
}

/**
 * Get configured apps only
 */
export function getConfiguredApps(): AppInfo[] {
  return detectApps().filter((app) => app.isConfigured);
}
