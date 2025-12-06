import { ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import {
  getThemesDir,
  getCustomThemesDir,
  getPreferencesPath,
  getStatePath,
} from './directories';
import type { Theme, ThemeMetadata, Preferences, State } from '../shared/types';

/**
 * Setup all IPC handlers
 */
export function setupIpcHandlers(): void {
  // Theme operations
  ipcMain.handle('theme:list', handleListThemes);
  ipcMain.handle('theme:get', handleGetTheme);
  ipcMain.handle('theme:apply', handleApplyTheme);
  ipcMain.handle('theme:create', handleCreateTheme);
  ipcMain.handle('theme:update', handleUpdateTheme);
  ipcMain.handle('theme:delete', handleDeleteTheme);
  ipcMain.handle('theme:export', handleExportTheme);
  ipcMain.handle('theme:import', handleImportTheme);

  // Wallpaper operations
  ipcMain.handle('wallpaper:list', handleListWallpapers);
  ipcMain.handle('wallpaper:apply', handleApplyWallpaper);

  // Application operations
  ipcMain.handle('apps:detect', handleDetectApps);
  ipcMain.handle('apps:setup', handleSetupApp);
  ipcMain.handle('apps:refresh', handleRefreshApp);

  // Preferences operations
  ipcMain.handle('preferences:get', handleGetPreferences);
  ipcMain.handle('preferences:set', handleSetPreferences);

  // System operations
  ipcMain.handle('system:appearance', handleGetSystemAppearance);

  console.log('IPC handlers registered');
}

/**
 * List all available themes
 */
async function handleListThemes(): Promise<Theme[]> {
  const themes: Theme[] = [];
  const themesDir = getThemesDir();
  const customThemesDir = getCustomThemesDir();

  // Load bundled themes
  if (fs.existsSync(themesDir)) {
    const themeNames = fs.readdirSync(themesDir);
    for (const themeName of themeNames) {
      const themePath = path.join(themesDir, themeName);
      if (fs.statSync(themePath).isDirectory()) {
        const theme = loadTheme(themePath, themeName, false);
        if (theme) {
          themes.push(theme);
        }
      }
    }
  }

  // Load custom themes
  if (fs.existsSync(customThemesDir)) {
    const themeNames = fs.readdirSync(customThemesDir);
    for (const themeName of themeNames) {
      const themePath = path.join(customThemesDir, themeName);
      if (fs.statSync(themePath).isDirectory()) {
        const theme = loadTheme(themePath, themeName, true);
        if (theme) {
          themes.push(theme);
        }
      }
    }
  }

  console.log(`Loaded ${themes.length} themes`);
  return themes;
}

/**
 * Load a single theme from directory
 */
function loadTheme(themePath: string, themeName: string, isCustom: boolean): Theme | null {
  const metadataPath = path.join(themePath, 'theme.json');

  if (!fs.existsSync(metadataPath)) {
    console.warn(`No theme.json found for ${themeName}`);
    return null;
  }

  try {
    const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
    const metadata: ThemeMetadata = JSON.parse(metadataContent);

    // Check if this is a light theme (based on light.mode file)
    const isLight = fs.existsSync(path.join(themePath, 'light.mode'));

    return {
      name: themeName,
      path: themePath,
      metadata,
      isCustom,
      isLight,
    };
  } catch (error) {
    console.error(`Error loading theme ${themeName}:`, error);
    return null;
  }
}

/**
 * Get a specific theme by name
 */
async function handleGetTheme(_event: any, name: string): Promise<Theme | null> {
  const themes = await handleListThemes();
  return themes.find((t) => t.name === name) || null;
}

/**
 * Apply a theme
 */
async function handleApplyTheme(_event: any, name: string): Promise<void> {
  console.log(`Applying theme: ${name}`);
  // TODO: Implement symlink update and app refresh
  // For now, just update the state
  const statePath = getStatePath();
  const state: State = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  state.currentTheme = name;
  state.lastSwitched = Date.now();
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  console.log(`Theme ${name} applied successfully`);
}

/**
 * Create a new custom theme
 */
async function handleCreateTheme(_event: any, data: ThemeMetadata): Promise<void> {
  console.log(`Creating theme: ${data.name}`);
  // TODO: Implement theme creation
}

/**
 * Update an existing custom theme
 */
async function handleUpdateTheme(_event: any, name: string, data: ThemeMetadata): Promise<void> {
  console.log(`Updating theme: ${name}`);
  // TODO: Implement theme update
}

/**
 * Delete a custom theme
 */
async function handleDeleteTheme(_event: any, name: string): Promise<void> {
  console.log(`Deleting theme: ${name}`);
  // TODO: Implement theme deletion
}

/**
 * Export a theme to a file
 */
async function handleExportTheme(_event: any, name: string, exportPath: string): Promise<void> {
  console.log(`Exporting theme ${name} to ${exportPath}`);
  // TODO: Implement theme export
}

/**
 * Import a theme from a file
 */
async function handleImportTheme(_event: any, importPath: string): Promise<void> {
  console.log(`Importing theme from ${importPath}`);
  // TODO: Implement theme import
}

/**
 * List wallpapers for a theme
 */
async function handleListWallpapers(_event: any, themeName: string): Promise<string[]> {
  console.log(`Listing wallpapers for theme: ${themeName}`);
  // TODO: Implement wallpaper listing
  return [];
}

/**
 * Apply a wallpaper
 */
async function handleApplyWallpaper(_event: any, wallpaperPath: string): Promise<void> {
  console.log(`Applying wallpaper: ${wallpaperPath}`);
  // TODO: Implement wallpaper application via osascript
}

/**
 * Detect installed applications
 */
async function handleDetectApps(): Promise<any[]> {
  console.log('Detecting installed applications');
  // TODO: Implement app detection
  return [];
}

/**
 * Setup an application for theming
 */
async function handleSetupApp(_event: any, appName: string, mode: string): Promise<void> {
  console.log(`Setting up app: ${appName} with mode: ${mode}`);
  // TODO: Implement app setup
}

/**
 * Refresh an application's theme
 */
async function handleRefreshApp(_event: any, appName: string): Promise<void> {
  console.log(`Refreshing app: ${appName}`);
  // TODO: Implement app refresh
}

/**
 * Get user preferences
 */
async function handleGetPreferences(): Promise<Preferences> {
  const prefsPath = getPreferencesPath();
  const prefsContent = fs.readFileSync(prefsPath, 'utf-8');
  return JSON.parse(prefsContent);
}

/**
 * Set user preferences
 */
async function handleSetPreferences(_event: any, prefs: Preferences): Promise<void> {
  const prefsPath = getPreferencesPath();
  fs.writeFileSync(prefsPath, JSON.stringify(prefs, null, 2));
  console.log('Preferences updated');
}

/**
 * Get system appearance (light/dark mode)
 */
async function handleGetSystemAppearance(): Promise<'light' | 'dark'> {
  // TODO: Implement actual system appearance detection
  return 'dark';
}
