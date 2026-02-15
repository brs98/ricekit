/**
 * App detection and setup operations
 */

import path from 'path';
import os from 'os';
import type { AppInfo } from '../../shared/types';
import { existsSync, readFile } from '../utils/fs';
import { hasRicekitIntegration } from './setup';
import { AEROSPACE_CONFIG_PATHS } from './constants';

// Re-export setup functions and types
export * from './setup';
export type { SetupResult } from './setup';

/** App category types matching AppInfo */
type AppCategory = 'terminal' | 'editor' | 'system' | 'tiling';

/** Shape for app definition entries */
interface AppDefinition {
  name: string;
  displayName: string;
  category: AppCategory;
  paths: string[];
  configPath: string;
  /** Ordered config paths to check (first match wins). Takes precedence over configPath. */
  configPaths?: readonly string[];
}

/**
 * App definitions for detection
 */
const APP_DEFINITIONS: readonly AppDefinition[] = [
  // Terminals
  {
    name: 'wezterm',
    displayName: 'WezTerm',
    category: 'terminal',
    paths: ['/Applications/WezTerm.app', path.join(os.homedir(), 'Applications', 'WezTerm.app')],
    configPath: path.join(os.homedir(), '.wezterm.lua'),
  },

  // Editors
  {
    name: 'neovim',
    displayName: 'Neovim',
    category: 'editor',
    paths: ['/usr/local/bin/nvim', '/opt/homebrew/bin/nvim'],
    configPath: path.join(os.homedir(), '.config', 'nvim'),
  },

  // System
  {
    name: 'sketchybar',
    displayName: 'SketchyBar',
    category: 'system',
    paths: ['/usr/local/bin/sketchybar', '/opt/homebrew/bin/sketchybar'],
    configPath: path.join(os.homedir(), '.config', 'sketchybar', 'sketchybarrc'),
  },

  // Tiling Managers
  {
    name: 'aerospace',
    displayName: 'AeroSpace',
    category: 'tiling',
    paths: [
      '/Applications/AeroSpace.app',
      path.join(os.homedir(), 'Applications', 'AeroSpace.app'),
      '/opt/homebrew/bin/aerospace',
      '/usr/local/bin/aerospace',
    ],
    configPath: path.join(os.homedir(), '.config', 'aerospace', 'aerospace.toml'),
    configPaths: AEROSPACE_CONFIG_PATHS,
  },
];

/** Apps whose configPath is a directory, not a file */
const DIRECTORY_CONFIG_APPS = new Set<string>();

/**
 * Resolve the effective config path for an app.
 * For apps with configPaths, returns the first existing path or the first entry as default.
 */
function resolveConfigPath(app: AppDefinition): string {
  if (app.configPaths) {
    return app.configPaths.find((p) => existsSync(p)) ?? app.configPaths[0] ?? app.configPath;
  }
  return app.configPath;
}

/**
 * Check if an app's config has Ricekit integration
 */
async function checkIntegration(app: AppDefinition, configPath: string): Promise<boolean> {
  if (!existsSync(configPath)) return false;

  // Neovim: check init.lua inside the config directory
  if (app.name === 'neovim') {
    const initLua = path.join(configPath, 'init.lua');
    if (!existsSync(initLua)) return false;
    try {
      const content = await readFile(initLua);
      return hasRicekitIntegration(content);
    } catch {
      return false;
    }
  }

  // Directory-based configs: can't read as file
  if (DIRECTORY_CONFIG_APPS.has(app.name)) {
    return false;
  }

  // File-based configs: read and check content
  try {
    const content = await readFile(configPath);
    return hasRicekitIntegration(content);
  } catch {
    return false;
  }
}

/**
 * Detect installed applications
 */
export async function detectApps(): Promise<AppInfo[]> {
  return Promise.all(
    APP_DEFINITIONS.map(async (app) => {
      const isInstalled = app.paths.some((p) => existsSync(p));
      const configPath = resolveConfigPath(app);
      const isConfigured = existsSync(configPath);
      const hasIntegration = isInstalled && isConfigured
        ? await checkIntegration(app, configPath)
        : false;

      return {
        name: app.name,
        displayName: app.displayName,
        category: app.category,
        isInstalled,
        isConfigured: isInstalled && isConfigured,
        hasRicekitIntegration: hasIntegration,
        configPath,
      };
    }),
  );
}

/**
 * Get installed apps only
 */
export async function getInstalledApps(): Promise<AppInfo[]> {
  const apps = await detectApps();
  return apps.filter((app) => app.isInstalled);
}

/**
 * Get configured apps only
 */
export async function getConfiguredApps(): Promise<AppInfo[]> {
  const apps = await detectApps();
  return apps.filter((app) => app.isConfigured);
}
