import { ipcMain, Notification, nativeTheme, dialog, shell } from 'electron';
import fs from 'fs';
import path from 'path';
import os from 'os';
import archiver from 'archiver';
import { promisify } from 'util';
import { exec, execSync } from 'child_process';
import {
  getThemesDir,
  getCustomThemesDir,
  getPreferencesPath,
  getStatePath,
  getUIStatePath,
  getCurrentDir,
  ensureDirectories,
  ensurePreferences,
  ensureState,
} from './directories';
import type { Theme, ThemeMetadata, Preferences, State } from '../shared/types';
import { createError } from '../shared/errors';
import { logger } from './logger';
import { generateThumbnails, clearOldThumbnails, getThumbnailCacheStats } from './thumbnails';
import {
  readJson,
  writeJson,
  readDir,
  isDirectory,
  existsSync,
  readFile,
  writeFile,
  ensureDir,
  copyFile,
  copyDir,
  unlink,
  rmdir,
  isSymlink,
  readSymlink,
  createSymlink,
  isExecutable,
  stat,
} from './utils/asyncFs';

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
  ipcMain.handle('theme:duplicate', handleDuplicateTheme);
  ipcMain.handle('theme:export', handleExportTheme);
  ipcMain.handle('theme:import', handleImportTheme);
  ipcMain.handle('theme:importFromUrl', handleImportThemeFromUrl);

  // Wallpaper operations
  ipcMain.handle('wallpaper:list', handleListWallpapers);
  ipcMain.handle('wallpaper:listWithThumbnails', handleListWallpapersWithThumbnails);
  ipcMain.handle('wallpaper:apply', handleApplyWallpaper);
  ipcMain.handle('wallpaper:getDisplays', handleGetDisplays);
  ipcMain.handle('wallpaper:clearThumbnailCache', handleClearThumbnailCache);
  ipcMain.handle('wallpaper:getThumbnailCacheStats', handleGetThumbnailCacheStats);
  ipcMain.handle('wallpaper:add', handleAddWallpapers);
  ipcMain.handle('wallpaper:remove', handleRemoveWallpaper);

  // Application operations
  ipcMain.handle('apps:detect', handleDetectApps);
  ipcMain.handle('apps:setup', handleSetupApp);
  ipcMain.handle('apps:refresh', handleRefreshApp);

  // Preferences operations
  ipcMain.handle('preferences:get', handleGetPreferences);
  ipcMain.handle('preferences:set', handleSetPreferences);
  ipcMain.handle('preferences:backup', handleBackupPreferences);
  ipcMain.handle('preferences:restore', handleRestorePreferences);

  // System operations
  ipcMain.handle('system:appearance', handleGetSystemAppearance);
  ipcMain.handle('system:getSunriseSunset', handleGetSunriseSunset);
  ipcMain.handle('system:openExternal', handleOpenExternal);
  ipcMain.handle('system:openPath', handleOpenPath);
  ipcMain.handle('system:openHelp', handleOpenHelp);

  // State operations
  ipcMain.handle('state:get', handleGetState);
  ipcMain.handle('uistate:save', handleSaveUIState);
  ipcMain.handle('uistate:get', handleGetUIState);

  // Quick switcher operations
  ipcMain.handle('quickswitcher:close', async () => {
    const { BrowserWindow } = await import('electron');
    const allWindows = BrowserWindow.getAllWindows();
    const quickSwitcher = allWindows.find(win => win.getTitle() === '' && win.isAlwaysOnTop());
    if (quickSwitcher) {
      quickSwitcher.hide();
    }
  });

  // Logging operations
  ipcMain.handle('logging:getDirectory', handleGetLogDirectory);
  ipcMain.handle('logging:getLogFile', handleGetLogFile);
  ipcMain.handle('logging:clearLogs', handleClearLogs);
  ipcMain.handle('logging:setDebugEnabled', handleSetDebugEnabled);
  ipcMain.handle('logging:isDebugEnabled', handleIsDebugEnabled);

  // Update operations
  ipcMain.handle('system:checkForUpdates', handleCheckForUpdates);

  logger.info('IPC handlers registered');
  logger.info('IPC handlers registered');
}

/**
 * List all available themes
 */
async function handleListThemes(): Promise<Theme[]> {
  const themes: Theme[] = [];
  const themesDir = getThemesDir();
  const customThemesDir = getCustomThemesDir();

  // Load bundled themes
  if (existsSync(themesDir)) {
    const themeNames = await readDir(themesDir);
    for (const themeName of themeNames) {
      const themePath = path.join(themesDir, themeName);
      if (await isDirectory(themePath)) {
        const theme = await loadTheme(themePath, themeName, false);
        if (theme) {
          themes.push(theme);
        }
      }
    }
  }

  // Load custom themes
  if (existsSync(customThemesDir)) {
    const themeNames = await readDir(customThemesDir);
    for (const themeName of themeNames) {
      const themePath = path.join(customThemesDir, themeName);
      if (await isDirectory(themePath)) {
        const theme = await loadTheme(themePath, themeName, true);
        if (theme) {
          themes.push(theme);
        }
      }
    }
  }

  logger.debug(`Loaded ${themes.length} themes`);
  return themes;
}

/**
 * Load a single theme from directory
 */
async function loadTheme(themePath: string, themeName: string, isCustom: boolean): Promise<Theme | null> {
  const metadataPath = path.join(themePath, 'theme.json');

  if (!existsSync(metadataPath)) {
    logger.warn(`No theme.json found for ${themeName}`);
    return null;
  }

  try {
    const metadata = await readJson<ThemeMetadata>(metadataPath);

    // Check if this is a light theme (based on light.mode file)
    const isLight = existsSync(path.join(themePath, 'light.mode'));

    return {
      name: themeName,
      path: themePath,
      metadata,
      isCustom,
      isLight,
    };
  } catch (error) {
    logger.error(`Error loading theme ${themeName}`, error);
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
 * Notify running terminal applications to reload their themes
 */
/**
 * Execute user-defined hook script if configured
 */
async function executeHookScript(themeName: string, hookScriptPath: string): Promise<void> {
  logger.debug(`Executing hook script: ${hookScriptPath}`);

  // Expand ~ to home directory
  const expandedPath = hookScriptPath.startsWith('~')
    ? path.join(os.homedir(), hookScriptPath.slice(1))
    : hookScriptPath;

  // Check if hook script exists
  if (!existsSync(expandedPath)) {
    logger.error(`Hook script not found: ${expandedPath}`);
    throw createError('HOOK_ERROR', `Hook script not found: ${expandedPath}`);
  }

  // Check if hook script is executable
  if (!(await isExecutable(expandedPath))) {
    logger.error(`Hook script is not executable: ${expandedPath}`);
    throw createError('HOOK_ERROR', `Hook script is not executable: ${expandedPath}. Run: chmod +x ${expandedPath}`);
  }

  // Execute the hook script with theme name as argument
  return new Promise((resolve, reject) => {
    exec(`"${expandedPath}" "${themeName}"`, (error, stdout, stderr) => {
      if (error) {
        logger.error(`Hook script execution failed: ${error.message}`, { stderr });
        reject(createError('HOOK_ERROR', `Hook script failed: ${error.message}`));
        return;
      }

      if (stdout) {
        logger.debug(`Hook script output: ${stdout.trim()}`);
      }

      if (stderr) {
        logger.debug(`Hook script stderr: ${stderr.trim()}`);
      }

      logger.info('Hook script executed successfully');
      resolve();
    });
  });
}

async function notifyTerminalsToReload(themePath: string): Promise<void> {
  logger.debug('Notifying terminals to reload themes...');

  // Get the colors from the theme for Kitty
  const themeJsonPath = path.join(themePath, 'theme.json');
  let themeColors: any = null;

  try {
    const themeData = await readJson<ThemeMetadata>(themeJsonPath);
    themeColors = themeData.colors;
  } catch (err) {
    logger.error('Failed to read theme colors', err);
  }

  // 1. Notify Kitty terminal
  // Check if Kitty is running and has remote control enabled
  try {
    const kittyConfigPath = path.join(themePath, 'kitty.conf');
    if (existsSync(kittyConfigPath) && themeColors) {
      // Build kitty @ set-colors command with theme colors
      const colorArgs: string[] = [];

      // Map theme colors to Kitty color names
      if (themeColors.background) colorArgs.push(`background=${themeColors.background}`);
      if (themeColors.foreground) colorArgs.push(`foreground=${themeColors.foreground}`);
      if (themeColors.cursor) colorArgs.push(`cursor=${themeColors.cursor}`);
      if (themeColors.selection) colorArgs.push(`selection_background=${themeColors.selection}`);

      // ANSI colors
      if (themeColors.black) colorArgs.push(`color0=${themeColors.black}`);
      if (themeColors.red) colorArgs.push(`color1=${themeColors.red}`);
      if (themeColors.green) colorArgs.push(`color2=${themeColors.green}`);
      if (themeColors.yellow) colorArgs.push(`color3=${themeColors.yellow}`);
      if (themeColors.blue) colorArgs.push(`color4=${themeColors.blue}`);
      if (themeColors.magenta) colorArgs.push(`color5=${themeColors.magenta}`);
      if (themeColors.cyan) colorArgs.push(`color6=${themeColors.cyan}`);
      if (themeColors.white) colorArgs.push(`color7=${themeColors.white}`);

      // Bright colors
      if (themeColors.brightBlack) colorArgs.push(`color8=${themeColors.brightBlack}`);
      if (themeColors.brightRed) colorArgs.push(`color9=${themeColors.brightRed}`);
      if (themeColors.brightGreen) colorArgs.push(`color10=${themeColors.brightGreen}`);
      if (themeColors.brightYellow) colorArgs.push(`color11=${themeColors.brightYellow}`);
      if (themeColors.brightBlue) colorArgs.push(`color12=${themeColors.brightBlue}`);
      if (themeColors.brightMagenta) colorArgs.push(`color13=${themeColors.brightMagenta}`);
      if (themeColors.brightCyan) colorArgs.push(`color14=${themeColors.brightCyan}`);
      if (themeColors.brightWhite) colorArgs.push(`color15=${themeColors.brightWhite}`);

      if (colorArgs.length > 0) {
        const kittyCommand = `kitty @ set-colors ${colorArgs.join(' ')}`;
        exec(kittyCommand, (error, stdout, stderr) => {
          if (error) {
            logger.info('Kitty not available or remote control disabled:', error.message);
          } else {
            logger.info('✓ Kitty terminal reloaded successfully');
          }
        });
      }
    }
  } catch (err) {
    logger.info('Could not notify Kitty:', err);
  }

  // 2. Notify iTerm2 using AppleScript
  try {
    const iterm2ConfigPath = path.join(themePath, 'iterm2.itermcolors');
    if (existsSync(iterm2ConfigPath)) {
      // AppleScript to reload iTerm2 profile
      const appleScript = `
        tell application "iTerm2"
          tell current session of current window
            set foreground color to {0, 0, 0}
            set background color to {65535, 65535, 65535}
          end tell
        end tell
      `;

      exec(`osascript -e '${appleScript}'`, (error, stdout, stderr) => {
        if (error) {
          logger.info('iTerm2 not available or not running:', error.message);
        } else {
          logger.info('✓ iTerm2 reloaded (profile refresh triggered)');
        }
      });
    }
  } catch (err) {
    logger.info('Could not notify iTerm2:', err);
  }

  // Note: Alacritty auto-reloads when config changes (watches config file)
  // Note: Warp requires manual reload
  // Note: Hyper auto-reloads when .hyper.js changes

  // 3. Notify WezTerm by updating the theme file directly
  // WezTerm watches files added to config_reload_watch_list
  // We write the theme content to a fixed location that WezTerm watches
  try {
    const weztermThemeSrc = path.join(themePath, 'wezterm.lua');
    const weztermThemeDest = path.join(os.homedir(), 'Library', 'Application Support', 'MacTheme', 'wezterm-colors.lua');

    if (existsSync(weztermThemeSrc)) {
      // Copy theme content to the fixed location (this triggers WezTerm's file watcher)
      fs.copyFileSync(weztermThemeSrc, weztermThemeDest);
      logger.info('✓ WezTerm theme file updated - will auto-reload');
    }
  } catch (err) {
    logger.info('Could not notify WezTerm:', err);
  }

  // 4. Reload SketchyBar
  try {
    execSync('sketchybar --reload', {
      stdio: 'pipe',
      timeout: 5000,
    });
    logger.info('✓ SketchyBar reloaded');
  } catch (err) {
    // SketchyBar may not be installed or running - that's ok
    logger.info('SketchyBar not available or not running');
  }

  logger.info('Terminal reload notifications sent');
}

/**
 * Theme name mapping for VS Code and Cursor
 * Maps MacTheme internal names to VS Code/Cursor theme extension names
 */
const editorThemeNameMapping: Record<string, string> = {
  'tokyo-night': 'Tokyo Night',
  'catppuccin-mocha': 'Catppuccin Mocha',
  'catppuccin-latte': 'Catppuccin Latte',
  'gruvbox-dark': 'Gruvbox Dark Hard',
  'gruvbox-light': 'Gruvbox Light Hard',
  'nord': 'Nord',
  'dracula': 'Dracula',
  'one-dark': 'One Dark Pro',
  'solarized-dark': 'Solarized Dark',
  'solarized-light': 'Solarized Light',
  'rose-pine': 'Rosé Pine',
};

/**
 * Update editor settings.json (VS Code or Cursor) with the current theme
 */
async function updateEditorSettings(
  editorName: string,
  settingsPath: string,
  themeName: string,
  themePath: string
): Promise<void> {
  logger.info(`Updating ${editorName} settings.json...`);

  try {
    const settingsDir = path.dirname(settingsPath);

    // Check if settings file exists
    if (!existsSync(settingsPath)) {
      logger.info(`${editorName} settings.json not found, creating it...`);
      if (!existsSync(settingsDir)) {
        fs.mkdirSync(settingsDir, { recursive: true });
      }
      // Create empty settings file
      fs.writeFileSync(settingsPath, '{}', 'utf-8');
    }

    // Read current settings
    let settings: any = {};
    try {
      const settingsContent = fs.readFileSync(settingsPath, 'utf-8');
      // Handle empty file or invalid JSON
      if (settingsContent.trim()) {
        settings = JSON.parse(settingsContent);
      }
    } catch (parseError) {
      logger.warn(`Failed to parse ${editorName} settings.json, starting with empty object:`, parseError);
      settings = {};
    }

    // Get the editor theme name from mapping
    const editorThemeName = editorThemeNameMapping[themeName] || 'Default Dark+';

    // Update the theme setting
    settings['workbench.colorTheme'] = editorThemeName;

    // Write back the settings file with formatting
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    logger.info(`✓ ${editorName} theme updated to: ${editorThemeName}`);
  } catch (error) {
    logger.error(`Failed to update ${editorName} settings:`, error);
    // Don't throw - this is a non-critical error
  }
}

/**
 * Update VS Code settings.json with the current theme
 */
async function updateVSCodeSettings(themeName: string, themePath: string): Promise<void> {
  const homeDir = os.homedir();
  const vscodeSettingsPath = path.join(homeDir, 'Library', 'Application Support', 'Code', 'User', 'settings.json');
  await updateEditorSettings('VS Code', vscodeSettingsPath, themeName, themePath);
}

/**
 * Update Cursor settings.json with the current theme
 */
async function updateCursorSettings(themeName: string, themePath: string): Promise<void> {
  const homeDir = os.homedir();
  const cursorSettingsPath = path.join(homeDir, 'Library', 'Application Support', 'Cursor', 'User', 'settings.json');
  await updateEditorSettings('Cursor', cursorSettingsPath, themeName, themePath);
}

/**
 * Apply a theme
 */
export async function handleApplyTheme(_event: any, name: string): Promise<void> {
  logger.info(`Applying theme: ${name}`);
  logger.info(`Applying theme: ${name}`);

  try {
    // Ensure all required directories exist
    ensureDirectories();
    ensureState();
    ensurePreferences();

    // Find the theme
    const theme = await handleGetTheme(null, name);
    if (!theme) {
      throw new Error(`THEME_NOT_FOUND: Theme "${name}" not found. Please check if the theme exists.`);
    }

    // Create or update symlink
    const currentDir = getCurrentDir();
    const symlinkPath = path.join(currentDir, 'theme');

    // Remove existing symlink if it exists
    try {
      if (existsSync(symlinkPath)) {
        // Check if it's a symlink
        const stats = fs.lstatSync(symlinkPath);
        if (stats.isSymbolicLink()) {
          fs.unlinkSync(symlinkPath);
          logger.info(`Removed existing symlink: ${symlinkPath}`);
        } else if (stats.isDirectory()) {
          // If it's a directory (shouldn't happen), remove it
          fs.rmSync(symlinkPath, { recursive: true, force: true });
          logger.info(`Removed existing directory: ${symlinkPath}`);
        }
      }
    } catch (err: any) {
      if (err.code === 'EACCES' || err.code === 'EPERM') {
        throw new Error(`PERMISSION_ERROR: MacTheme doesn't have permission to modify theme files. Please check folder permissions.`);
      }
      throw err;
    }

    // Create new symlink
    try {
      fs.symlinkSync(theme.path, symlinkPath, 'dir');
      logger.debug(`Created symlink: ${symlinkPath} -> ${theme.path}`);
      logger.info(`Created symlink: ${symlinkPath} -> ${theme.path}`);
    } catch (err: any) {
      logger.error('Failed to create symlink', err);
      logger.error('Failed to create symlink:', err);
      if (err.code === 'EACCES' || err.code === 'EPERM') {
        throw new Error(`PERMISSION_ERROR: Cannot create theme link due to insufficient permissions. Please check folder permissions in ~/Library/Application Support/MacTheme.`);
      } else if (err.code === 'EEXIST') {
        throw new Error(`FILE_EXISTS: A file or folder already exists at the theme location. Please remove it and try again.`);
      } else if (err.code === 'ENOSPC') {
        throw new Error(`NO_SPACE: Not enough disk space to apply theme.`);
      }
      throw new Error(`SYMLINK_ERROR: Failed to create theme link: ${err.message}`);
    }

    // Update state
    const statePath = getStatePath();
    let state: State;
    try {
      state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    } catch (err: any) {
      if (err.code === 'EACCES' || err.code === 'EPERM') {
        throw new Error(`PERMISSION_ERROR: Cannot read app state file. Please check permissions for ~/Library/Application Support/MacTheme.`);
      }
      throw err;
    }

    state.currentTheme = name;
    state.lastSwitched = Date.now();

    try {
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
    } catch (err: any) {
      if (err.code === 'EACCES' || err.code === 'EPERM') {
        throw new Error(`PERMISSION_ERROR: Cannot save app state. Please check write permissions for ~/Library/Application Support/MacTheme.`);
      } else if (err.code === 'ENOSPC') {
        throw new Error(`NO_SPACE: Not enough disk space to save theme state.`);
      }
      throw err;
    }

    // Update recent themes in preferences
    const prefsPath = getPreferencesPath();
    let prefs: Preferences;
    try {
      prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf-8'));
    } catch (err: any) {
      if (err.code === 'EACCES' || err.code === 'EPERM') {
        throw new Error(`PERMISSION_ERROR: Cannot read preferences. Please check permissions for ~/Library/Application Support/MacTheme.`);
      }
      throw err;
    }

    // Add to recent themes (remove if already exists to avoid duplicates)
    if (!prefs.recentThemes) {
      prefs.recentThemes = [];
    }
    prefs.recentThemes = prefs.recentThemes.filter(t => t !== name);
    prefs.recentThemes.unshift(name); // Add to beginning

    // Keep only last 10 recent themes
    if (prefs.recentThemes.length > 10) {
      prefs.recentThemes = prefs.recentThemes.slice(0, 10);
    }

    try {
      fs.writeFileSync(prefsPath, JSON.stringify(prefs, null, 2));
    } catch (err: any) {
      // Don't fail the theme application if we can't update preferences
      logger.error('Failed to update preferences:', err);
    }

    logger.info(`Theme applied successfully: ${name}`, { recentThemes: prefs.recentThemes.slice(0, 5) });
    logger.info(`Updated recent themes: ${prefs.recentThemes.slice(0, 5).join(', ')}`);
    logger.info(`Theme ${name} applied successfully`);

    // Show notification if enabled
    const shouldShowNotification = prefs.notifications?.onThemeChange ?? prefs.showNotifications ?? true;
    if (Notification.isSupported() && shouldShowNotification) {
      const notification = new Notification({
        title: 'Theme Applied',
        body: `${theme.metadata.name} is now active`,
        silent: false,
      });
      notification.show();
    }

    // Update tray menu with new recent themes
    try {
      const { refreshTrayMenu, updateWindowTitle } = await import('./main');
      refreshTrayMenu();
      updateWindowTitle(name);
    } catch (err) {
      logger.error('Failed to refresh tray menu:', err);
    }

    // Update VS Code settings if enabled
    try {
      if (prefs.enabledApps && prefs.enabledApps.includes('vscode')) {
        await updateVSCodeSettings(name, theme.path);
      } else {
        logger.info('VS Code integration disabled in preferences');
      }
    } catch (err) {
      logger.error('Failed to update VS Code settings:', err);
    }

    // Update Cursor settings if enabled
    try {
      if (prefs.enabledApps && prefs.enabledApps.includes('cursor')) {
        await updateCursorSettings(name, theme.path);
      } else {
        logger.info('Cursor integration disabled in preferences');
      }
    } catch (err) {
      logger.error('Failed to update Cursor settings:', err);
    }

    // Notify terminal applications to reload themes
    try {
      await notifyTerminalsToReload(theme.path);
    } catch (err) {
      logger.error('Failed to notify terminals:', err);
    }

    // Execute user-defined hook script if configured
    try {
      if (prefs.hookScript && prefs.hookScript.trim() !== '') {
        await executeHookScript(name, prefs.hookScript);
      } else {
        logger.info('No hook script configured');
      }
    } catch (err) {
      logger.error('Failed to execute hook script:', err);
      // Don't throw - hook script failure shouldn't block theme application
    }

    // Update AeroSpace/JankyBorders if enabled
    try {
      const isAerospaceEnabled = !prefs.enabledApps || prefs.enabledApps.length === 0 || prefs.enabledApps.includes('aerospace');
      if (isAerospaceEnabled) {
        const bordersScript = path.join(theme.path, 'aerospace-borders.sh');
        if (existsSync(bordersScript)) {
          // Check if borders is running before trying to refresh
          try {
            execSync('pgrep -x borders', { stdio: 'pipe' });
            // Borders is running, refresh it
            execSync(`bash "${bordersScript}"`, {
              shell: '/bin/bash',
              stdio: 'pipe',
              timeout: 5000,
            });
            logger.info('AeroSpace/JankyBorders theme refreshed automatically');
          } catch {
            // Borders not running, skip refresh (not an error)
            logger.info('JankyBorders not running, skipping border refresh');
          }
        }
      }
    } catch (err) {
      logger.error('Failed to refresh AeroSpace/JankyBorders:', err);
      // Don't throw - borders failure shouldn't block theme application
    }

    // Automatically apply the first wallpaper from the theme
    try {
      const wallpapers = await handleListWallpapers(null, name);
      if (wallpapers.length > 0) {
        logger.info(`Automatically applying first wallpaper: ${wallpapers[0]}`);
        await handleApplyWallpaper(null, wallpapers[0]);
      } else {
        logger.info('No wallpapers found in theme, skipping automatic wallpaper');
      }
    } catch (err) {
      logger.error('Failed to apply automatic wallpaper:', err);
      // Don't throw - wallpaper failure shouldn't block theme application
    }
  } catch (err: any) {
    // Log the full error for debugging
    logger.error('Error applying theme:', err);

    // Re-throw with user-friendly message
    if (err.message && err.message.includes(':')) {
      // Already formatted error (e.g., "PERMISSION_ERROR: ...")
      throw err;
    } else {
      // Generic error - wrap it
      throw new Error(`UNEXPECTED_ERROR: Failed to apply theme: ${err.message || 'Unknown error'}`);
    }
  }
}

/**
 * Create a new custom theme
 */
async function handleCreateTheme(_event: any, data: ThemeMetadata): Promise<void> {
  logger.info(`Creating theme: ${data.name}`);
  logger.info(`Creating theme: ${data.name}`);

  ensureDirectories();
  const customThemesDir = getCustomThemesDir();

  // Create a safe directory name from the theme name
  const themeDirName = data.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const themeDir = path.join(customThemesDir, themeDirName);

  // Check if theme already exists
  if (existsSync(themeDir)) {
    logger.warn(`Attempt to create duplicate theme: ${data.name}`);
    throw new Error(`Theme "${data.name}" already exists`);
  }

  // Import the helper function from themeInstaller
  const { generateThemeConfigFiles } = await import('./themeInstaller');

  // Generate all config files
  generateThemeConfigFiles(themeDir, data);

  logger.info(`Theme created successfully: ${data.name}`, { path: themeDir });
  logger.info(`Theme "${data.name}" created successfully at ${themeDir}`);

  // Show notification
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: 'Theme Created',
      body: `${data.name} has been created successfully`,
      silent: false,
    });
    notification.show();
  }
}

/**
 * Update an existing custom theme
 */
async function handleUpdateTheme(_event: any, name: string, data: ThemeMetadata): Promise<void> {
  logger.info(`Updating theme: ${name}`);

  try {
    // Only allow updating custom themes
    const customThemesDir = getCustomThemesDir();

    // Create safe directory name from the theme name
    const themeDirName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const themeDir = path.join(customThemesDir, themeDirName);

    // Check if theme exists in custom themes directory
    if (!existsSync(themeDir)) {
      throw createError('THEME_NOT_FOUND', 'Theme not found in custom themes directory. Only custom themes can be updated.');
    }

    // Read existing theme metadata to preserve any fields not in the update
    const existingMetadataPath = path.join(themeDir, 'theme.json');
    let existingMetadata: ThemeMetadata;
    if (existsSync(existingMetadataPath)) {
      existingMetadata = await readJson<ThemeMetadata>(existingMetadataPath);
    } else {
      throw createError('THEME_INVALID', 'Theme metadata (theme.json) not found');
    }

    // Merge existing metadata with updates
    const updatedMetadata: ThemeMetadata = {
      ...existingMetadata,
      ...data,
      // Preserve the original name unless explicitly changed
      name: data.name || existingMetadata.name || name,
    };

    // Import the helper function from themeInstaller
    const { generateThemeConfigFiles } = await import('./themeInstaller');

    // Remove all existing config files (but not wallpapers or other directories)
    const configFiles = [
      'alacritty.toml',
      'kitty.conf',
      'iterm2.itermcolors',
      'warp.yaml',
      'hyper.js',
      'vscode.json',
      'cursor.json',
      'neovim.lua',
      'raycast.json',
      'bat.conf',
      'delta.gitconfig',
      'starship.toml',
      'zsh-theme.zsh',
      'theme.json'
    ];

    for (const file of configFiles) {
      const filePath = path.join(themeDir, file);
      if (existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Regenerate all config files with the updated metadata
    generateThemeConfigFiles(themeDir, updatedMetadata);

    logger.info(`Theme "${name}" updated successfully at ${themeDir}`);

    // Show notification
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: 'Theme Updated',
        body: `${updatedMetadata.name} has been updated successfully`,
        silent: false,
      });
      notification.show();
    }

    // If this is the currently active theme, we may want to notify terminals to reload
    const state = await handleGetState();
    if (state.currentTheme === name) {
      logger.info('Updated theme is currently active, notifying terminals to reload...');
      try {
        await notifyTerminalsToReload(themeDir);
      } catch (err) {
        logger.error('Failed to notify terminals:', err);
      }
    }
  } catch (error) {
    logger.error('Error updating theme:', error);
    throw error;
  }
}

/**
 * Delete a custom theme
 */
async function handleDeleteTheme(_event: any, name: string): Promise<void> {
  logger.info(`Deleting theme: ${name}`);

  try {
    // Only allow deletion of custom themes
    const customThemesDir = getCustomThemesDir();
    const themeDir = path.join(customThemesDir, name);

    // Check if theme exists in custom themes directory
    if (!existsSync(themeDir)) {
      throw createError('THEME_NOT_FOUND', 'Theme not found in custom themes directory');
    }

    // Check if this is the currently active theme
    const state = await handleGetState();
    if (state.currentTheme === name) {
      throw createError('THEME_ACTIVE', 'Cannot delete the currently active theme. Please switch to a different theme first.');
    }

    // Delete the theme directory recursively
    await rmdir(themeDir);
    logger.info(`Successfully deleted theme: ${name}`);

    // Show notification
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: 'Theme Deleted',
        body: `${name} has been removed`,
        silent: false,
      });
      notification.show();
    }
  } catch (error) {
    logger.error('Error deleting theme:', error);
    throw error;
  }
}

/**
 * Duplicate a theme (creates a copy in custom-themes)
 */
async function handleDuplicateTheme(_event: any, sourceThemeName: string): Promise<void> {
  logger.info(`Duplicating theme: ${sourceThemeName}`);

  try {
    // Find the source theme
    const themesDir = getThemesDir();
    const customThemesDir = getCustomThemesDir();

    let sourceThemeDir: string;
    if (existsSync(path.join(themesDir, sourceThemeName))) {
      sourceThemeDir = path.join(themesDir, sourceThemeName);
    } else if (existsSync(path.join(customThemesDir, sourceThemeName))) {
      sourceThemeDir = path.join(customThemesDir, sourceThemeName);
    } else {
      throw createError('THEME_NOT_FOUND', 'Source theme not found');
    }

    // Read source theme metadata
    const sourceMetadataPath = path.join(sourceThemeDir, 'theme.json');
    const sourceMetadata = await readJson<ThemeMetadata>(sourceMetadataPath);

    // Generate new theme name
    let copyNumber = 1;
    let newThemeName = `${sourceMetadata.name} (Copy)`;
    let newThemeDir = path.join(customThemesDir, `${sourceThemeName}-copy`);

    while (existsSync(newThemeDir)) {
      copyNumber++;
      newThemeName = `${sourceMetadata.name} (Copy ${copyNumber})`;
      newThemeDir = path.join(customThemesDir, `${sourceThemeName}-copy-${copyNumber}`);
    }

    // Create new theme directory
    fs.mkdirSync(newThemeDir, { recursive: true });

    // Copy all files from source theme
    const files = fs.readdirSync(sourceThemeDir);
    for (const file of files) {
      const sourcePath = path.join(sourceThemeDir, file);
      const destPath = path.join(newThemeDir, file);

      const stat = fs.statSync(sourcePath);
      if (stat.isDirectory()) {
        // Recursively copy directories (like wallpapers)
        fs.cpSync(sourcePath, destPath, { recursive: true });
      } else {
        fs.copyFileSync(sourcePath, destPath);
      }
    }

    // Update metadata in the copy
    const newMetadata = {
      ...sourceMetadata,
      name: newThemeName,
      author: `${sourceMetadata.author} (duplicated)`,
    };
    fs.writeFileSync(
      path.join(newThemeDir, 'theme.json'),
      JSON.stringify(newMetadata, null, 2)
    );

    logger.info(`Successfully duplicated theme to: ${newThemeName}`);

    // Show notification
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: 'Theme Duplicated',
        body: `Created ${newThemeName}`,
        silent: false,
      });
      notification.show();
    }
  } catch (error) {
    logger.error('Error duplicating theme:', error);
    throw error;
  }
}

/**
 * Export a theme to a file
 * If exportPath is null/undefined, shows a save dialog
 * Returns the path where the theme was exported
 */
async function handleExportTheme(_event: any, name: string, exportPath?: string): Promise<string> {
  logger.info(`Exporting theme ${name}`);

  try {
    const themesDir = getThemesDir();
    const customThemesDir = getCustomThemesDir();

    // Find the theme directory
    let themePath = path.join(themesDir, name);
    if (!existsSync(themePath)) {
      themePath = path.join(customThemesDir, name);
      if (!existsSync(themePath)) {
        throw new Error(`Theme "${name}" not found`);
      }
    }

    // If no export path provided, show save dialog
    if (!exportPath) {
      const { BrowserWindow } = await import('electron');
      const mainWindow = BrowserWindow.getAllWindows()[0];

      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Export Theme',
        defaultPath: `${name}.mactheme`,
        filters: [
          { name: 'MacTheme Files', extensions: ['mactheme', 'zip'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['createDirectory', 'showOverwriteConfirmation']
      });

      if (result.canceled || !result.filePath) {
        throw createError('EXPORT_CANCELED', 'Export canceled');
      }

      exportPath = result.filePath;
    }

    // Ensure the export path has an extension
    if (!exportPath.endsWith('.mactheme') && !exportPath.endsWith('.zip')) {
      exportPath += '.mactheme';
    }

    // Create a zip archive
    await new Promise<void>((resolve, reject) => {
      const output = fs.createWriteStream(exportPath!);
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      output.on('close', () => {
        logger.info(`Theme exported: ${archive.pointer()} bytes written to ${exportPath}`);
        resolve();
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);

      // Add the entire theme directory to the archive
      archive.directory(themePath, name);

      archive.finalize();
    });

    logger.info(`Successfully exported theme "${name}" to ${exportPath}`);
    return exportPath;
  } catch (error) {
    logger.error('Failed to export theme:', error);
    throw error;
  }
}

/**
 * Import a theme from a file
 * If importPath is null/undefined, shows an open dialog
 */
async function handleImportTheme(_event: any, importPath?: string): Promise<void> {
  logger.info(`Importing theme${importPath ? ` from ${importPath}` : ''}`);

  try {
    const execAsync = promisify(exec);

    // If no import path provided, show open dialog
    if (!importPath) {
      const { BrowserWindow } = await import('electron');
      const mainWindow = BrowserWindow.getAllWindows()[0];

      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Import Theme',
        filters: [
          { name: 'MacTheme Files', extensions: ['mactheme', 'zip'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        throw createError('IMPORT_CANCELED', 'Import canceled');
      }

      importPath = result.filePaths[0];
    }

    // Validate file exists
    if (!existsSync(importPath)) {
      throw createError('FILE_NOT_FOUND', `File not found: ${importPath}`);
    }

    // Create temporary directory for extraction
    const tmpDir = path.join(os.tmpdir(), `mactheme-import-${Date.now()}`);
    await ensureDir(tmpDir);

    try {
      // Extract the zip archive
      logger.info(`Extracting archive to: ${tmpDir}`);
      await execAsync(`unzip -q "${importPath}" -d "${tmpDir}"`);

      // Find the theme directory (should be the only directory in tmpDir)
      const extractedContents = await readDir(tmpDir);

      if (extractedContents.length === 0) {
        throw createError('INVALID_ARCHIVE', 'Archive is empty');
      }

      // Get the theme directory (first directory in the extracted contents)
      let themeDir: string | undefined;
      for (const name of extractedContents) {
        const itemPath = path.join(tmpDir, name);
        if (await isDirectory(itemPath)) {
          themeDir = name;
          break;
        }
      }

      if (!themeDir) {
        throw createError('INVALID_ARCHIVE', 'No theme directory found in archive');
      }

      const extractedThemePath = path.join(tmpDir, themeDir);

      // Validate theme structure - must have theme.json
      const themeMetadataPath = path.join(extractedThemePath, 'theme.json');
      if (!existsSync(themeMetadataPath)) {
        throw createError('THEME_INVALID', 'Invalid theme: missing theme.json');
      }

      // Read and parse theme metadata
      const themeMetadata = await readJson<ThemeMetadata>(themeMetadataPath);
      const themeName = themeMetadata.name || themeDir;

      // Determine destination directory
      const customThemesDir = getCustomThemesDir();
      let destThemeDir = path.join(customThemesDir, themeDir);

      // Check if theme already exists
      if (existsSync(destThemeDir)) {
        // Generate unique name by appending number
        let counter = 1;
        while (existsSync(path.join(customThemesDir, `${themeDir}-${counter}`))) {
          counter++;
        }
        destThemeDir = path.join(customThemesDir, `${themeDir}-${counter}`);
        logger.info(`Theme already exists, importing as: ${path.basename(destThemeDir)}`);
      }

      // Copy theme to custom-themes directory
      fs.cpSync(extractedThemePath, destThemeDir, { recursive: true });
      logger.info(`Theme imported to: ${destThemeDir}`);

      // Clean up temp directory
      fs.rmSync(tmpDir, { recursive: true, force: true });

      // Show success notification
      if (Notification.isSupported()) {
        const notification = new Notification({
          title: 'Theme Imported',
          body: `${themeName} has been imported successfully`,
          silent: false,
        });
        notification.show();
      }

      logger.info(`Successfully imported theme: ${themeName}`);
    } catch (extractError) {
      // Clean up temp directory on error
      if (existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
      throw extractError;
    }
  } catch (error) {
    logger.error('Failed to import theme:', error);
    throw error;
  }
}

/**
 * Import theme from URL
 */
async function handleImportThemeFromUrl(_event: any, url: string): Promise<void> {
  logger.info(`Importing theme from URL: ${url}`);

  try {
    const https = await import('https');
    const http = await import('http');
    const execAsync = promisify(exec);

    // Validate URL
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL provided');
    }

    // Parse URL to determine protocol
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch (error) {
      throw new Error('Invalid URL format');
    }

    // Only allow http and https protocols for security
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error('Only HTTP and HTTPS URLs are supported');
    }

    // Create temporary directory for download
    const tmpDir = path.join(os.tmpdir(), `mactheme-url-import-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    try {
      // Download file from URL
      const downloadPath = path.join(tmpDir, 'theme.zip');
      logger.info(`Downloading from ${url} to ${downloadPath}`);

      await new Promise<void>((resolve, reject) => {
        const file = fs.createWriteStream(downloadPath);
        const client = parsedUrl.protocol === 'https:' ? https : http;

        const request = client.get(url, (response) => {
          // Handle redirects
          if (response.statusCode === 301 || response.statusCode === 302) {
            const redirectUrl = response.headers.location;
            if (redirectUrl) {
              logger.info(`Following redirect to: ${redirectUrl}`);
              file.close();

              // Recursively handle redirect
              const redirectClient = redirectUrl.startsWith('https:') ? https : http;
              const redirectRequest = redirectClient.get(redirectUrl, (redirectResponse) => {
                if (redirectResponse.statusCode !== 200) {
                  reject(new Error(`HTTP ${redirectResponse.statusCode}: ${redirectResponse.statusMessage}`));
                  return;
                }

                redirectResponse.pipe(file);

                file.on('finish', () => {
                  file.close();
                  resolve();
                });
              });

              redirectRequest.on('error', (err) => {
                fs.unlinkSync(downloadPath);
                reject(err);
              });

              return;
            }
          }

          // Check for successful response
          if (response.statusCode !== 200) {
            reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
            return;
          }

          response.pipe(file);

          file.on('finish', () => {
            file.close();
            resolve();
          });
        });

        request.on('error', (err) => {
          fs.unlinkSync(downloadPath);
          reject(err);
        });

        file.on('error', (err) => {
          fs.unlinkSync(downloadPath);
          reject(err);
        });
      });

      logger.info(`Download complete: ${downloadPath}`);

      // Verify file was downloaded and is not empty
      const stats = fs.statSync(downloadPath);
      if (stats.size === 0) {
        throw new Error('Downloaded file is empty');
      }

      logger.info(`Downloaded file size: ${stats.size} bytes`);

      // Use the existing import logic to process the downloaded file
      await handleImportTheme(_event, downloadPath);

      // Clean up temp directory
      fs.rmSync(tmpDir, { recursive: true, force: true });

      logger.info(`Successfully imported theme from URL: ${url}`);
    } catch (downloadError) {
      // Clean up temp directory on error
      if (existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
      throw downloadError;
    }
  } catch (error: any) {
    logger.error('Failed to import theme from URL:', error);
    throw new Error(`Failed to import theme from URL: ${error.message}`);
  }
}

/**
 * List wallpapers for a theme
 */
async function handleListWallpapers(_event: any, themeName: string): Promise<string[]> {
  logger.info(`Listing wallpapers for theme: ${themeName}`);

  try {
    const themesDir = getThemesDir();
    const customThemesDir = getCustomThemesDir();

    // Try bundled themes first
    let themePath = path.join(themesDir, themeName);
    if (!existsSync(themePath)) {
      // Try custom themes
      themePath = path.join(customThemesDir, themeName);
    }

    const wallpapersDir = path.join(themePath, 'wallpapers');

    if (!existsSync(wallpapersDir)) {
      logger.info(`No wallpapers directory found for theme: ${themeName}`);
      return [];
    }

    const files = fs.readdirSync(wallpapersDir);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.png', '.jpg', '.jpeg', '.heic', '.webp'].includes(ext);
    });

    // Return full paths to the wallpaper files
    const wallpaperPaths = imageFiles.map(file => path.join(wallpapersDir, file));

    logger.info(`Found ${wallpaperPaths.length} wallpapers for theme: ${themeName}`);
    return wallpaperPaths;
  } catch (error) {
    logger.error(`Error listing wallpapers for theme ${themeName}:`, error);
    return [];
  }
}

/**
 * List wallpapers with thumbnails for better performance
 * Returns an array of objects with original path and thumbnail path
 */
async function handleListWallpapersWithThumbnails(_event: any, themeName: string): Promise<Array<{ original: string; thumbnail: string }>> {
  logger.info(`Listing wallpapers with thumbnails for theme: ${themeName}`);

  try {
    // Get all wallpaper paths
    const wallpaperPaths = await handleListWallpapers(_event, themeName);

    if (wallpaperPaths.length === 0) {
      return [];
    }

    // Generate thumbnails
    logger.info(`Generating thumbnails for ${wallpaperPaths.length} wallpapers...`);
    const thumbnailMap = await generateThumbnails(wallpaperPaths);

    // Build result array
    const result = wallpaperPaths.map((originalPath) => ({
      original: originalPath,
      thumbnail: thumbnailMap.get(originalPath) || originalPath,
    }));

    logger.info(`Successfully generated ${result.length} thumbnails`);
    return result;
  } catch (error) {
    logger.error(`Error listing wallpapers with thumbnails for theme ${themeName}:`, error);
    // Fallback: return original paths
    const wallpaperPaths = await handleListWallpapers(_event, themeName);
    return wallpaperPaths.map((path) => ({ original: path, thumbnail: path }));
  }
}

/**
 * Clear thumbnail cache
 */
async function handleClearThumbnailCache(): Promise<void> {
  try {
    logger.info('Clearing thumbnail cache...');
    clearOldThumbnails();
    logger.info('Thumbnail cache cleared successfully');
  } catch (error) {
    logger.error('Error clearing thumbnail cache:', error);
    throw error;
  }
}

/**
 * Get thumbnail cache statistics
 */
async function handleGetThumbnailCacheStats(): Promise<{ count: number; sizeBytes: number; sizeMB: number }> {
  try {
    const stats = getThumbnailCacheStats();
    return {
      ...stats,
      sizeMB: Math.round((stats.sizeBytes / (1024 * 1024)) * 100) / 100,
    };
  } catch (error) {
    logger.error('Error getting thumbnail cache stats:', error);
    return { count: 0, sizeBytes: 0, sizeMB: 0 };
  }
}

/**
 * Apply a wallpaper
 */
async function handleApplyWallpaper(_event: any, wallpaperPath: string, displayIndex?: number): Promise<void> {
  logger.info(`Applying wallpaper: ${wallpaperPath}`, displayIndex !== undefined ? `to display ${displayIndex}` : 'to all displays');

  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    // Check if wallpaper file exists
    if (!existsSync(wallpaperPath)) {
      throw new Error(`Wallpaper file not found: ${wallpaperPath}`);
    }

    // Use osascript to set the wallpaper
    let script: string;

    if (displayIndex !== undefined && displayIndex !== null) {
      // Set wallpaper for specific display (1-indexed)
      script = `
        tell application "System Events"
          set picture of desktop ${displayIndex} to "${wallpaperPath}"
        end tell
      `;
    } else {
      // Set wallpaper for all displays
      script = `
        tell application "System Events"
          tell every desktop
            set picture to "${wallpaperPath}"
          end tell
        end tell
      `;
    }

    await execAsync(`osascript -e '${script}'`);

    // Create symlink to current wallpaper
    const currentDir = getCurrentDir();
    const wallpaperSymlink = path.join(currentDir, 'wallpaper');

    // Remove existing symlink if it exists
    if (existsSync(wallpaperSymlink)) {
      fs.unlinkSync(wallpaperSymlink);
    }

    // Create new symlink
    fs.symlinkSync(wallpaperPath, wallpaperSymlink);

    // Update state with current wallpaper
    const statePath = getStatePath();
    const state: State = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    state.currentWallpaper = wallpaperPath;
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

    // Show notification
    if (Notification.isSupported()) {
      const body = displayIndex !== undefined && displayIndex !== null
        ? `Wallpaper updated for Display ${displayIndex}`
        : `Wallpaper updated for all displays`;

      const notification = new Notification({
        title: 'Wallpaper Applied',
        body,
        silent: false,
      });
      notification.show();
    }

    logger.info(`Wallpaper applied successfully: ${wallpaperPath}`);
  } catch (error) {
    logger.error(`Error applying wallpaper:`, error);
    throw error;
  }
}

/**
 * Get list of connected displays
 */
async function handleGetDisplays(): Promise<any[]> {
  logger.info('Getting connected displays');

  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    // Use system_profiler to get display information
    const { stdout } = await execAsync('system_profiler SPDisplaysDataType -json');
    const data = JSON.parse(stdout);

    const displays: any[] = [];

    // Parse the display data
    if (data.SPDisplaysDataType && data.SPDisplaysDataType.length > 0) {
      data.SPDisplaysDataType.forEach((gpu: any, gpuIndex: number) => {
        if (gpu.spdisplays_ndrvs && Array.isArray(gpu.spdisplays_ndrvs)) {
          gpu.spdisplays_ndrvs.forEach((display: any, displayIndex: number) => {
            displays.push({
              id: `display-${gpuIndex}-${displayIndex}`,
              index: displays.length + 1,
              name: display._name || `Display ${displays.length + 1}`,
              resolution: display._spdisplays_resolution || 'Unknown',
              isMain: display.spdisplays_main === 'spdisplays_yes',
            });
          });
        }
      });
    }

    // If no displays found, return at least one (the current display)
    if (displays.length === 0) {
      displays.push({
        id: 'display-0-0',
        index: 1,
        name: 'Display 1',
        resolution: 'Unknown',
        isMain: true,
      });
    }

    logger.info(`Found ${displays.length} display(s):`, displays);
    return displays;
  } catch (error) {
    logger.error('Error getting displays:', error);
    // Return a default display on error
    return [{
      id: 'display-0-0',
      index: 1,
      name: 'Display 1',
      resolution: 'Unknown',
      isMain: true,
    }];
  }
}

/**
 * Add wallpaper(s) to a theme
 * Opens a file dialog and copies selected images to the theme's wallpapers directory
 */
async function handleAddWallpapers(_event: any, themeName: string): Promise<{ added: string[]; errors: string[] }> {
  logger.info(`Adding wallpapers to theme: ${themeName}`);

  try {
    // Open file dialog to select images
    const result = await dialog.showOpenDialog({
      title: 'Select Wallpapers to Add',
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'heic', 'webp'] },
      ],
      properties: ['openFile', 'multiSelections'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      logger.info('Wallpaper selection canceled');
      return { added: [], errors: [] };
    }

    // Find theme directory
    const themesDir = getThemesDir();
    const customThemesDir = getCustomThemesDir();

    let themePath = path.join(themesDir, themeName);
    if (!existsSync(themePath)) {
      themePath = path.join(customThemesDir, themeName);
    }

    if (!existsSync(themePath)) {
      throw new Error(`Theme not found: ${themeName}`);
    }

    // Ensure wallpapers directory exists
    const wallpapersDir = path.join(themePath, 'wallpapers');
    if (!existsSync(wallpapersDir)) {
      fs.mkdirSync(wallpapersDir, { recursive: true });
    }

    const added: string[] = [];
    const errors: string[] = [];

    // Copy each selected file to the wallpapers directory
    for (const sourcePath of result.filePaths) {
      try {
        const fileName = path.basename(sourcePath);
        let destPath = path.join(wallpapersDir, fileName);

        // Handle duplicate filenames by adding a suffix
        if (existsSync(destPath)) {
          const ext = path.extname(fileName);
          const baseName = path.basename(fileName, ext);
          let counter = 1;
          while (existsSync(destPath)) {
            destPath = path.join(wallpapersDir, `${baseName}-${counter}${ext}`);
            counter++;
          }
        }

        fs.copyFileSync(sourcePath, destPath);
        added.push(destPath);
        logger.info(`Added wallpaper: ${destPath}`);
      } catch (err) {
        const errorMsg = `Failed to copy ${sourcePath}: ${err instanceof Error ? err.message : String(err)}`;
        errors.push(errorMsg);
        logger.error(errorMsg);
      }
    }

    // Show notification
    if (Notification.isSupported() && added.length > 0) {
      const notification = new Notification({
        title: 'Wallpapers Added',
        body: `Added ${added.length} wallpaper${added.length > 1 ? 's' : ''} to ${themeName}`,
        silent: false,
      });
      notification.show();
    }

    return { added, errors };
  } catch (error) {
    logger.error(`Error adding wallpapers to theme ${themeName}:`, error);
    throw error;
  }
}

/**
 * Remove a wallpaper from a theme
 */
async function handleRemoveWallpaper(_event: any, wallpaperPath: string): Promise<void> {
  logger.info(`Removing wallpaper: ${wallpaperPath}`);

  try {
    // Verify the file exists
    if (!existsSync(wallpaperPath)) {
      throw new Error(`Wallpaper not found: ${wallpaperPath}`);
    }

    // Safety check: ensure the file is inside a wallpapers directory
    const parentDir = path.basename(path.dirname(wallpaperPath));
    if (parentDir !== 'wallpapers') {
      throw new Error('Cannot remove file: not in a wallpapers directory');
    }

    // Delete the file
    fs.unlinkSync(wallpaperPath);
    logger.info(`Removed wallpaper: ${wallpaperPath}`);

    // Check if this was the current wallpaper and clear the symlink if so
    const currentDir = getCurrentDir();
    const wallpaperSymlink = path.join(currentDir, 'wallpaper');

    if (existsSync(wallpaperSymlink)) {
      try {
        const currentWallpaper = fs.readlinkSync(wallpaperSymlink);
        if (currentWallpaper === wallpaperPath) {
          fs.unlinkSync(wallpaperSymlink);
          // Update state to clear current wallpaper
          const statePath = getStatePath();
          const state: State = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
          delete state.currentWallpaper;
          fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
          logger.info('Cleared current wallpaper reference');
        }
      } catch {
        // Symlink might not exist or be readable, ignore
      }
    }

    // Show notification
    if (Notification.isSupported()) {
      const fileName = path.basename(wallpaperPath);
      const notification = new Notification({
        title: 'Wallpaper Removed',
        body: `Removed ${fileName}`,
        silent: false,
      });
      notification.show();
    }
  } catch (error) {
    logger.error(`Error removing wallpaper:`, error);
    throw error;
  }
}

/**
 * Detect installed applications
 */
async function handleDetectApps(): Promise<any[]> {
  logger.info('Detecting installed applications');

  const apps = [
    // Terminals
    {
      name: 'alacritty',
      displayName: 'Alacritty',
      category: 'terminal',
      paths: [
        '/Applications/Alacritty.app',
        path.join(process.env.HOME || '', 'Applications', 'Alacritty.app'),
      ],
      configPath: path.join(process.env.HOME || '', '.config', 'alacritty', 'alacritty.toml'),
    },
    {
      name: 'kitty',
      displayName: 'Kitty',
      category: 'terminal',
      paths: [
        '/Applications/kitty.app',
        path.join(process.env.HOME || '', 'Applications', 'kitty.app'),
      ],
      configPath: path.join(process.env.HOME || '', '.config', 'kitty', 'kitty.conf'),
    },
    {
      name: 'iterm2',
      displayName: 'iTerm2',
      category: 'terminal',
      paths: [
        '/Applications/iTerm.app',
        path.join(process.env.HOME || '', 'Applications', 'iTerm.app'),
      ],
      configPath: path.join(process.env.HOME || '', 'Library', 'Preferences', 'com.googlecode.iterm2.plist'),
    },
    {
      name: 'warp',
      displayName: 'Warp',
      category: 'terminal',
      paths: [
        '/Applications/Warp.app',
        path.join(process.env.HOME || '', 'Applications', 'Warp.app'),
      ],
      configPath: path.join(process.env.HOME || '', '.warp', 'themes'),
    },
    {
      name: 'hyper',
      displayName: 'Hyper',
      category: 'terminal',
      paths: [
        '/Applications/Hyper.app',
        path.join(process.env.HOME || '', 'Applications', 'Hyper.app'),
      ],
      configPath: path.join(process.env.HOME || '', '.hyper.js'),
    },
    {
      name: 'wezterm',
      displayName: 'WezTerm',
      category: 'terminal',
      paths: [
        '/Applications/WezTerm.app',
        path.join(process.env.HOME || '', 'Applications', 'WezTerm.app'),
      ],
      configPath: path.join(process.env.HOME || '', '.config', 'wezterm', 'wezterm.lua'),
    },

    // Editors
    {
      name: 'vscode',
      displayName: 'Visual Studio Code',
      category: 'editor',
      paths: [
        '/Applications/Visual Studio Code.app',
        path.join(process.env.HOME || '', 'Applications', 'Visual Studio Code.app'),
      ],
      configPath: path.join(process.env.HOME || '', 'Library', 'Application Support', 'Code', 'User', 'settings.json'),
    },
    {
      name: 'cursor',
      displayName: 'Cursor',
      category: 'editor',
      paths: [
        '/Applications/Cursor.app',
        path.join(process.env.HOME || '', 'Applications', 'Cursor.app'),
      ],
      configPath: path.join(process.env.HOME || '', 'Library', 'Application Support', 'Cursor', 'User', 'settings.json'),
    },
    {
      name: 'neovim',
      displayName: 'Neovim',
      category: 'editor',
      paths: [
        '/usr/local/bin/nvim',
        '/opt/homebrew/bin/nvim',
      ],
      configPath: path.join(process.env.HOME || '', '.config', 'nvim'),
    },
    {
      name: 'sublime',
      displayName: 'Sublime Text',
      category: 'editor',
      paths: [
        '/Applications/Sublime Text.app',
        path.join(process.env.HOME || '', 'Applications', 'Sublime Text.app'),
      ],
      configPath: path.join(process.env.HOME || '', 'Library', 'Application Support', 'Sublime Text', 'Packages', 'User'),
    },

    // CLI Tools
    {
      name: 'bat',
      displayName: 'bat',
      category: 'cli',
      paths: [
        '/usr/local/bin/bat',
        '/opt/homebrew/bin/bat',
      ],
      configPath: path.join(process.env.HOME || '', '.config', 'bat', 'config'),
    },
    {
      name: 'delta',
      displayName: 'delta',
      category: 'cli',
      paths: [
        '/usr/local/bin/delta',
        '/opt/homebrew/bin/delta',
      ],
      configPath: path.join(process.env.HOME || '', '.gitconfig'),
    },
    {
      name: 'starship',
      displayName: 'Starship',
      category: 'cli',
      paths: [
        '/usr/local/bin/starship',
        '/opt/homebrew/bin/starship',
      ],
      configPath: path.join(process.env.HOME || '', '.config', 'starship.toml'),
    },
    {
      name: 'fzf',
      displayName: 'fzf',
      category: 'cli',
      paths: [
        '/usr/local/bin/fzf',
        '/opt/homebrew/bin/fzf',
      ],
      configPath: path.join(process.env.HOME || '', '.fzf.bash'),
    },
    {
      name: 'lazygit',
      displayName: 'lazygit',
      category: 'cli',
      paths: [
        '/usr/local/bin/lazygit',
        '/opt/homebrew/bin/lazygit',
      ],
      configPath: path.join(process.env.HOME || '', '.config', 'lazygit', 'config.yml'),
    },
    {
      name: 'sketchybar',
      displayName: 'SketchyBar',
      category: 'system',
      paths: [
        '/usr/local/bin/sketchybar',
        '/opt/homebrew/bin/sketchybar',
      ],
      configPath: path.join(process.env.HOME || '', '.config', 'sketchybar', 'sketchybarrc'),
    },

    // Launchers
    {
      name: 'raycast',
      displayName: 'Raycast',
      category: 'launcher',
      paths: [
        '/Applications/Raycast.app',
        path.join(process.env.HOME || '', 'Applications', 'Raycast.app'),
      ],
      configPath: path.join(process.env.HOME || '', 'Library', 'Application Support', 'Raycast'),
    },
    {
      name: 'alfred',
      displayName: 'Alfred',
      category: 'launcher',
      paths: [
        '/Applications/Alfred 5.app',
        '/Applications/Alfred 4.app',
        path.join(process.env.HOME || '', 'Applications', 'Alfred 5.app'),
      ],
      configPath: path.join(process.env.HOME || '', 'Library', 'Application Support', 'Alfred'),
    },

    // Communication
    {
      name: 'slack',
      displayName: 'Slack',
      category: 'communication',
      paths: [
        '/Applications/Slack.app',
        path.join(process.env.HOME || '', 'Applications', 'Slack.app'),
      ],
      configPath: path.join(process.env.HOME || '', 'Library', 'Application Support', 'MacTheme', 'current', 'theme', 'slack-theme.txt'),
    },

    // Tiling Managers
    {
      name: 'aerospace',
      displayName: 'AeroSpace',
      category: 'tiling',
      paths: [
        '/Applications/AeroSpace.app',
        path.join(process.env.HOME || '', 'Applications', 'AeroSpace.app'),
        '/opt/homebrew/bin/aerospace',
        '/usr/local/bin/aerospace',
      ],
      configPath: path.join(process.env.HOME || '', '.config', 'aerospace', 'aerospace.toml'),
    },
  ];

  // Check which apps are installed and configured
  const detectedApps = apps.map(app => {
    // Check if app is installed
    const isInstalled = app.paths.some(p => existsSync(p));

    // Check if config file exists (means it might be configured)
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

  logger.info(`Detected ${detectedApps.filter(a => a.isInstalled).length} installed apps`);
  return detectedApps;
}

/**
 * Setup Cursor or VS Code for theming
 * These editors don't support file imports, so we directly configure them
 * and add them to enabledApps for automatic theme switching
 */
async function setupEditorApp(
  appName: string,
  displayName: string,
  settingsPath: string
): Promise<void> {
  logger.info(`Setting up ${displayName}...`);

  const settingsDir = path.dirname(settingsPath);

  // Create settings directory if it doesn't exist
  if (!existsSync(settingsDir)) {
    fs.mkdirSync(settingsDir, { recursive: true });
  }

  // Create backup if settings file exists
  if (existsSync(settingsPath)) {
    const backupPath = `${settingsPath}.mactheme-backup`;
    fs.copyFileSync(settingsPath, backupPath);
    logger.info(`Created backup at: ${backupPath}`);
  }

  // Get current theme to apply
  const state = await handleGetState();
  const currentThemeName = state.currentTheme;

  if (currentThemeName) {
    // Apply current theme to the editor
    const theme = await handleGetTheme(null, currentThemeName);
    if (theme) {
      if (appName === 'cursor') {
        await updateCursorSettings(currentThemeName, theme.path);
      } else if (appName === 'vscode') {
        await updateVSCodeSettings(currentThemeName, theme.path);
      }
    }
  }

  // Add to enabledApps in preferences so future theme changes update this app
  const prefs = await handleGetPreferences();
  if (!prefs.enabledApps) {
    prefs.enabledApps = [];
  }
  if (!prefs.enabledApps.includes(appName)) {
    prefs.enabledApps.push(appName);
    await handleSetPreferences(null, prefs);
    logger.info(`Added ${appName} to enabled apps`);
  }

  logger.info(`Successfully configured ${displayName}`);
}

/**
 * Setup an application for theming
 * Automatically configures the app's config file to import MacTheme themes
 */
async function handleSetupApp(_event: any, appName: string): Promise<void> {
  logger.info(`Setting up app: ${appName}`);

  const homeDir = os.homedir();
  const themeBasePath = '~/Library/Application Support/MacTheme/current/theme';

  try {
    // Handle Cursor and VS Code specially - they don't support file imports
    if (appName === 'cursor') {
      const cursorSettingsPath = path.join(homeDir, 'Library', 'Application Support', 'Cursor', 'User', 'settings.json');
      await setupEditorApp('cursor', 'Cursor', cursorSettingsPath);

      // Show notification
      if (Notification.isSupported()) {
        const notification = new Notification({
          title: 'Setup Complete',
          body: 'Cursor has been configured to use MacTheme themes. Themes will be applied automatically when you switch themes.',
          silent: false,
        });
        notification.show();
      }
      return;
    }

    if (appName === 'vscode') {
      const vscodeSettingsPath = path.join(homeDir, 'Library', 'Application Support', 'Code', 'User', 'settings.json');
      await setupEditorApp('vscode', 'Visual Studio Code', vscodeSettingsPath);

      // Show notification
      if (Notification.isSupported()) {
        const notification = new Notification({
          title: 'Setup Complete',
          body: 'VS Code has been configured to use MacTheme themes. Themes will be applied automatically when you switch themes.',
          silent: false,
        });
        notification.show();
      }
      return;
    }

    // Handle Slack specially - it requires manual theme application
    if (appName === 'slack') {
      const slackThemePath = path.join(homeDir, 'Library', 'Application Support', 'MacTheme', 'current', 'theme', 'slack-theme.txt');
      
      // Check if theme file exists
      if (existsSync(slackThemePath)) {
        // Open the theme file in the default text editor
        const { shell } = require('electron');
        await shell.openPath(slackThemePath);
        
        // Show notification with instructions
        if (Notification.isSupported()) {
          const notification = new Notification({
            title: 'Slack Theme Setup',
            body: 'Theme file opened. Copy the theme string and paste it in Slack Preferences → Themes → Custom theme',
            silent: false,
          });
          notification.show();
        }
      } else {
        throw new Error('Slack theme file not found. Please apply a theme first.');
      }
      
      // Add to enabledApps
      const prefs = await handleGetPreferences();
      if (!prefs.enabledApps) {
        prefs.enabledApps = [];
      }
      if (!prefs.enabledApps.includes('slack')) {
        prefs.enabledApps.push('slack');
        await handleSetPreferences(null, prefs);
      }
      return;
    }

    // Define config paths and import statements for other apps
    const appConfigs: Record<string, { configPath: string; importLine: string; section?: string }> = {
      alacritty: {
        configPath: path.join(homeDir, '.config', 'alacritty', 'alacritty.toml'),
        importLine: `import = ["${themeBasePath}/alacritty.toml"]`,
      },
      kitty: {
        configPath: path.join(homeDir, '.config', 'kitty', 'kitty.conf'),
        importLine: `include ${themeBasePath}/kitty.conf`,
      },
      neovim: {
        configPath: path.join(homeDir, '.config', 'nvim', 'init.lua'),
        importLine: `dofile(vim.fn.expand("${themeBasePath}/neovim.lua"))`,
      },
      starship: {
        configPath: path.join(homeDir, '.config', 'starship.toml'),
        importLine: `"$include" = '${themeBasePath}/starship.toml'`,
      },
      wezterm: {
        configPath: path.join(homeDir, '.config', 'wezterm', 'wezterm.lua'),
        importLine: `-- MacTheme WezTerm integration
local mactheme_colors = wezterm.home_dir .. "/Library/Application Support/MacTheme/wezterm-colors.lua"
wezterm.add_to_config_reload_watch_list(mactheme_colors)
config.colors = dofile(mactheme_colors)`,
      },
      sketchybar: {
        configPath: path.join(homeDir, '.config', 'sketchybar', 'sketchybarrc'),
        importLine: `# MacTheme SketchyBar integration
source "$HOME/Library/Application Support/MacTheme/current/theme/sketchybar-colors.sh"`,
      },
      aerospace: {
        configPath: path.join(homeDir, '.config', 'aerospace', 'aerospace.toml'),
        importLine: `# MacTheme AeroSpace/JankyBorders integration
# Note: JankyBorders must be installed for border colors to work
# Install with: brew install FelixKratz/formulae/borders
after-startup-command = [
  'exec-and-forget source "$HOME/Library/Application Support/MacTheme/current/theme/aerospace-borders.sh"'
]`,
      },
    };

    const config = appConfigs[appName];
    if (!config) {
      throw new Error(`Unsupported app: ${appName}`);
    }

    const { configPath, importLine } = config;
    const configDir = path.dirname(configPath);

    // Create config directory if it doesn't exist
    if (!existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Read existing config or create new one
    let configContent = '';
    if (existsSync(configPath)) {
      // Create backup
      const backupPath = `${configPath}.bak`;
      fs.copyFileSync(configPath, backupPath);
      logger.info(`Created backup at: ${backupPath}`);

      configContent = fs.readFileSync(configPath, 'utf-8');

      // Check if import already exists
      if (configContent.includes(importLine) || configContent.includes('MacTheme/current/theme')) {
        throw new Error('MacTheme import already exists in config file');
      }
    }

    // Add import statement at the top of the file
    const newContent = importLine + '\n\n' + configContent;
    fs.writeFileSync(configPath, newContent, 'utf-8');

    logger.info(`Successfully configured ${appName} at ${configPath}`);

    // Add to enabledApps in preferences so the app is tracked
    const prefs = await handleGetPreferences();
    if (!prefs.enabledApps) {
      prefs.enabledApps = [];
    }
    if (!prefs.enabledApps.includes(appName)) {
      prefs.enabledApps.push(appName);
      await handleSetPreferences(null, prefs);
      logger.info(`Added ${appName} to enabled apps`);
    }

    // Show notification
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: 'Setup Complete',
        body: `${appName} has been configured to use MacTheme themes`,
        silent: false,
      });
      notification.show();
    }
  } catch (error: any) {
    logger.error(`Failed to setup ${appName}:`, error);
    throw new Error(`Failed to setup ${appName}: ${error.message}`);
  }
}

/**
 * Refresh an application's theme
 * Sends reload signal to supported applications
 */
async function handleRefreshApp(_event: any, appName: string): Promise<void> {
  logger.info(`Refreshing app: ${appName}`);

  try {
    switch (appName.toLowerCase()) {
      case 'kitty':
        // Kitty supports remote control via socket
        // Send reload config command to all running Kitty instances
        try {
          execSync('kitty @ --to unix:/tmp/kitty set-colors --all --configured', {
            stdio: 'pipe',
            timeout: 5000,
          });
          logger.info('Kitty theme refreshed successfully');
        } catch (error: any) {
          // If socket doesn't exist or kitty isn't running, that's ok
          if (error.message.includes('No such file') || error.message.includes('Connection refused')) {
            logger.info('Kitty is not running or remote control is not enabled');
          } else {
            throw error;
          }
        }
        break;

      case 'iterm2':
        // iTerm2 can be refreshed via AppleScript
        try {
          execSync(`osascript -e 'tell application "iTerm2" to tell current session of current window to reload profile'`, {
            stdio: 'pipe',
            timeout: 5000,
          });
          logger.info('iTerm2 theme refreshed successfully');
        } catch (error: any) {
          if (error.message.includes('not running')) {
            logger.info('iTerm2 is not running');
          } else {
            throw error;
          }
        }
        break;

      case 'alacritty':
        // Alacritty watches config file, so just touching it triggers reload
        const alacrittyConfig = path.join(os.homedir(), '.config', 'alacritty', 'alacritty.toml');
        if (existsSync(alacrittyConfig)) {
          const now = new Date();
          fs.utimesSync(alacrittyConfig, now, now);
          logger.info('Alacritty config touched - will auto-reload');
        } else {
          logger.info('Alacritty config not found');
        }
        break;

      case 'vscode':
        // Re-apply the current theme settings to VS Code
        try {
          const state = await handleGetState();
          if (state.currentTheme) {
            const theme = await handleGetTheme(null, state.currentTheme);
            if (theme) {
              await updateVSCodeSettings(state.currentTheme, theme.path);
              logger.info('VS Code theme settings refreshed');
            }
          }
        } catch (err) {
          logger.info('Could not refresh VS Code:', err);
        }
        break;

      case 'cursor':
        // Re-apply the current theme settings to Cursor
        try {
          const state = await handleGetState();
          if (state.currentTheme) {
            const theme = await handleGetTheme(null, state.currentTheme);
            if (theme) {
              await updateCursorSettings(state.currentTheme, theme.path);
              logger.info('Cursor theme settings refreshed');
            }
          }
        } catch (err) {
          logger.info('Could not refresh Cursor:', err);
        }
        break;

      case 'neovim':
        logger.info('Neovim requires manual reload (:source $MYVIMRC) to apply theme changes');
        break;

      case 'wezterm':
        // WezTerm watches the wezterm-colors.lua file we manage
        // Re-copy the current theme to trigger a reload
        try {
          const currentThemePath = path.join(os.homedir(), 'Library', 'Application Support', 'MacTheme', 'current', 'theme');
          const weztermThemeSrc = path.join(currentThemePath, 'wezterm.lua');
          const weztermThemeDest = path.join(os.homedir(), 'Library', 'Application Support', 'MacTheme', 'wezterm-colors.lua');

          if (existsSync(weztermThemeSrc)) {
            fs.copyFileSync(weztermThemeSrc, weztermThemeDest);
            logger.info('WezTerm theme file updated - will auto-reload');
          } else {
            logger.info('WezTerm theme source not found');
          }
        } catch (err) {
          logger.info('Could not refresh WezTerm:', err);
        }
        break;

      case 'sketchybar':
        // SketchyBar can be reloaded via command line
        try {
          execSync('sketchybar --reload', {
            stdio: 'pipe',
            timeout: 5000,
          });
          logger.info('SketchyBar theme refreshed successfully');
        } catch (err) {
          logger.info('Could not refresh SketchyBar - it may not be running:', err);
        }
        break;

      case 'slack':
        // Slack doesn't support automatic theme refresh
        // Users need to manually paste the theme string from the theme file
        logger.info('Slack requires manual theme application. Open Preferences → Themes → Create custom theme and paste the theme string from the slack-theme.txt file.');
        break;

      case 'aerospace':
        // AeroSpace uses JankyBorders for window borders
        // Re-run the borders command with updated colors from the theme
        try {
          const currentThemePath = path.join(os.homedir(), 'Library', 'Application Support', 'MacTheme', 'current', 'theme');
          const bordersScript = path.join(currentThemePath, 'aerospace-borders.sh');
          
          if (existsSync(bordersScript)) {
            // Execute the borders script to apply new colors
            // The script handles killing existing borders process and starting fresh
            execSync(`bash "${bordersScript}"`, {
              shell: '/bin/bash',
              stdio: 'pipe',
              timeout: 5000,
            });
            logger.info('AeroSpace/JankyBorders theme refreshed successfully');
          } else {
            logger.info('AeroSpace borders script not found');
          }
        } catch (err) {
          logger.info('Could not refresh AeroSpace/JankyBorders - borders may not be installed:', err);
        }
        break;

      default:
        logger.info(`App refresh not supported for ${appName}`);
    }
  } catch (error: any) {
    logger.error(`Failed to refresh ${appName}:`, error);
    throw new Error(`Failed to refresh ${appName}: ${error.message}`);
  }
}

/**
 * Get user preferences
 */
async function handleGetPreferences(): Promise<Preferences> {
  ensureDirectories();
  ensurePreferences(); // This now validates and repairs corrupted files
  const prefsPath = getPreferencesPath();

  try {
    const prefsContent = fs.readFileSync(prefsPath, 'utf-8');
    return JSON.parse(prefsContent);
  } catch (error) {
    // This should never happen after ensurePreferences(), but just in case...
    logger.error('Failed to read preferences after validation:', error);
    // Import the function to get defaults
    const { getDefaultPreferences } = await import('./directories');
    return getDefaultPreferences();
  }
}

/**
 * Set user preferences
 */
async function handleSetPreferences(_event: any, prefs: Preferences): Promise<void> {
  ensureDirectories();
  ensurePreferences();
  const prefsPath = getPreferencesPath();

  // Read old preferences to detect changes
  const oldPrefs = JSON.parse(fs.readFileSync(prefsPath, 'utf-8')) as Preferences;

  // Write new preferences
  fs.writeFileSync(prefsPath, JSON.stringify(prefs, null, 2));
  logger.info('Preferences updated');

  // Check if showInMenuBar preference changed
  if (oldPrefs.showInMenuBar !== prefs.showInMenuBar) {
    try {
      const { updateTrayVisibility } = await import('./main');
      updateTrayVisibility(prefs.showInMenuBar);
      logger.info(`Menu bar icon ${prefs.showInMenuBar ? 'shown' : 'hidden'}`);
    } catch (err) {
      logger.error('Failed to update tray visibility:', err);
    }
  }

  // Check if keyboard shortcut changed
  if (oldPrefs.keyboardShortcuts.quickSwitcher !== prefs.keyboardShortcuts.quickSwitcher) {
    try {
      const { updateQuickSwitcherShortcut } = await import('./main');
      updateQuickSwitcherShortcut(prefs.keyboardShortcuts.quickSwitcher);
      logger.info(`Keyboard shortcut updated to: ${prefs.keyboardShortcuts.quickSwitcher}`);
    } catch (err) {
      logger.error('Failed to update keyboard shortcut:', err);
    }
  }

  // Check if wallpaper schedule changed - restart scheduler to pick up new schedules
  const oldScheduleEnabled = oldPrefs.wallpaperSchedule?.enabled || false;
  const newScheduleEnabled = prefs.wallpaperSchedule?.enabled || false;
  const oldSchedulesJson = JSON.stringify(oldPrefs.wallpaperSchedule?.schedules || []);
  const newSchedulesJson = JSON.stringify(prefs.wallpaperSchedule?.schedules || []);

  if (oldScheduleEnabled !== newScheduleEnabled || oldSchedulesJson !== newSchedulesJson) {
    logger.info('Wallpaper schedule preferences changed, restarting scheduler');
    stopWallpaperScheduler();
    if (newScheduleEnabled) {
      startWallpaperScheduler();
    }
  }
}

/**
 * Backup preferences to a user-selected file
 */
async function handleBackupPreferences(): Promise<string | null> {
  try {
    // Show save dialog to let user choose backup location
    const { filePath } = await dialog.showSaveDialog({
      title: 'Backup Preferences',
      defaultPath: path.join(os.homedir(), 'Downloads', 'mactheme-preferences-backup.json'),
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['createDirectory', 'showOverwriteConfirmation']
    });

    if (!filePath) {
      // User cancelled
      return null;
    }

    // Read current preferences
    const prefsPath = getPreferencesPath();
    const prefsContent = fs.readFileSync(prefsPath, 'utf-8');
    const prefs = JSON.parse(prefsContent);

    // Add metadata to backup
    const backup = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      preferences: prefs
    };

    // Write to backup file
    fs.writeFileSync(filePath, JSON.stringify(backup, null, 2));
    logger.info('Preferences backed up to:', filePath);

    return filePath;
  } catch (err) {
    logger.error('Failed to backup preferences:', err);
    throw new Error('Failed to backup preferences: ' + (err as Error).message);
  }
}

/**
 * Restore preferences from a user-selected backup file
 */
async function handleRestorePreferences(): Promise<boolean> {
  try {
    // Show open dialog to let user select backup file
    const { filePaths } = await dialog.showOpenDialog({
      title: 'Restore Preferences',
      defaultPath: os.homedir(),
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });

    if (!filePaths || filePaths.length === 0) {
      // User cancelled
      return false;
    }

    const backupPath = filePaths[0];

    // Read and parse backup file
    const backupContent = fs.readFileSync(backupPath, 'utf-8');
    const backup = JSON.parse(backupContent);

    // Validate backup structure
    if (!backup.preferences) {
      throw new Error('Invalid backup file: missing preferences data');
    }

    // Restore preferences
    const prefsPath = getPreferencesPath();

    // Create backup of current preferences before restoring
    const currentBackupPath = `${prefsPath}.pre-restore-${Date.now()}.bak`;
    fs.copyFileSync(prefsPath, currentBackupPath);
    logger.info(`Created safety backup at: ${currentBackupPath}`);

    // Write restored preferences
    fs.writeFileSync(prefsPath, JSON.stringify(backup.preferences, null, 2));
    logger.info('Preferences restored from:', backupPath);

    // Update tray visibility if showInMenuBar changed
    try {
      const { updateTrayVisibility } = await import('./main');
      updateTrayVisibility(backup.preferences.showInMenuBar || false);
    } catch (err) {
      logger.error('Failed to update tray visibility after restore:', err);
    }

    return true;
  } catch (err) {
    logger.error('Failed to restore preferences:', err);
    throw new Error('Failed to restore preferences: ' + (err as Error).message);
  }
}

/**
 * Get system appearance (light/dark mode)
 */
async function handleGetSystemAppearance(): Promise<'light' | 'dark'> {
  // Use Electron's nativeTheme to detect system appearance
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
}

/**
 * Open a URL in the default external browser
 */
async function handleOpenExternal(_event: any, url: string): Promise<void> {
  try {
    await shell.openExternal(url);
  } catch (error: any) {
    logger.error('Failed to open external URL:', error);
    throw new Error(`Failed to open URL: ${error.message}`);
  }
}

/**
 * Open a file or folder path in the default application
 */
async function handleOpenPath(_event: any, filePath: string): Promise<void> {
  try {
    // Expand ~ to home directory
    const expandedPath = filePath.replace(/^~/, os.homedir());

    if (!existsSync(expandedPath)) {
      throw new Error(`Path does not exist: ${filePath}`);
    }

    await shell.openPath(expandedPath);
  } catch (error: any) {
    logger.error('Failed to open path:', error);
    throw new Error(`Failed to open path: ${error.message}`);
  }
}

/**
 * Open help documentation in default markdown viewer or browser
 */
async function handleOpenHelp(_event: any): Promise<void> {
  try {
    // Get the app's root directory (in development) or resources path (in production)
    const { app } = await import('electron');
    const isDev = !app.isPackaged;

    let helpFilePath: string;

    if (isDev) {
      // In development, HELP.md is in the project root
      helpFilePath = path.join(app.getAppPath(), 'HELP.md');
    } else {
      // In production, HELP.md would be in the resources folder
      // For now, just use the app path
      helpFilePath = path.join(app.getAppPath(), 'HELP.md');
    }

    // Check if file exists
    if (!existsSync(helpFilePath)) {
      logger.warn('HELP.md not found at:', helpFilePath);
      // Fall back to opening GitHub URL
      await shell.openExternal('https://github.com/yourusername/mactheme#readme');
      return;
    }

    // Open the help file with the default markdown viewer/editor
    await shell.openPath(helpFilePath);

    logger.info('Opened help file:', helpFilePath);
  } catch (error: any) {
    logger.error('Failed to open help:', error);
    throw new Error(`Failed to open help: ${error.message}`);
  }
}

/**
 * Helper function to apply dynamic wallpaper based on system appearance
 * Looks for light.* or dark.* wallpapers in the current theme
 */
async function applyDynamicWallpaper(appearance: 'light' | 'dark', themeName: string): Promise<void> {
  try {
    const themePath = path.join(getThemesDir(), themeName);
    const wallpapersDir = path.join(themePath, 'wallpapers');

    // Check if wallpapers directory exists
    if (!existsSync(wallpapersDir)) {
      logger.info(`No wallpapers directory found for theme: ${themeName}`);
      return;
    }

    // List all files in wallpapers directory
    const files = fs.readdirSync(wallpapersDir);

    // Look for appearance-specific wallpapers
    // Naming convention: light.png, light.jpg, light-*.png, dark.png, dark.jpg, dark-*.png
    const appearancePattern = new RegExp(`^${appearance}[\\.\\-]`, 'i');
    const matchingWallpaper = files.find(file => appearancePattern.test(file));

    if (!matchingWallpaper) {
      logger.info(`No ${appearance} wallpaper found for theme: ${themeName}`);
      return;
    }

    // Apply the wallpaper
    const wallpaperPath = path.join(wallpapersDir, matchingWallpaper);
    logger.info(`Applying dynamic ${appearance} wallpaper: ${wallpaperPath}`);
    await handleApplyWallpaper(null, wallpaperPath);
  } catch (error) {
    logger.error(`Error applying dynamic wallpaper:`, error);
  }
}

/**
 * Apply theme automatically based on system appearance
 * Called when system appearance changes
 */
export async function handleAppearanceChange(): Promise<void> {
  try {
    // Get current system appearance
    const appearance = await handleGetSystemAppearance();
    logger.info(`System appearance changed to: ${appearance}`);

    // Notify all renderer windows about the appearance change
    // This allows components to react to appearance changes via onAppearanceChange callback
    const { BrowserWindow } = await import('electron');
    const allWindows = BrowserWindow.getAllWindows();
    allWindows.forEach(window => {
      window.webContents.send('system:appearance-changed', appearance);
    });

    // Get preferences to check if auto-switching is enabled
    const prefs = await handleGetPreferences();

    // Check if dynamic wallpaper is enabled (even if auto-switch is off)
    if (prefs.dynamicWallpaper?.enabled) {
      const state = await handleGetState();
      logger.info(`Dynamic wallpaper enabled, applying ${appearance} wallpaper for current theme: ${state.currentTheme}`);
      await applyDynamicWallpaper(appearance, state.currentTheme);
    }

    // Check if auto-switching based on system appearance is enabled
    if (!prefs.autoSwitch?.enabled || prefs.autoSwitch?.mode !== 'system') {
      return;
    }

    // Get the appropriate theme based on appearance
    const themeToApply = appearance === 'dark'
      ? prefs.defaultDarkTheme
      : prefs.defaultLightTheme;

    if (!themeToApply) {
      logger.warn(`No default ${appearance} theme configured`);
      return;
    }

    // Get current state to avoid unnecessary theme switches
    const state = await handleGetState();
    if (state.currentTheme === themeToApply) {
      logger.info(`Already using theme: ${themeToApply}`);
      return;
    }

    // Apply the theme
    logger.info(`Auto-switching to ${appearance} theme: ${themeToApply}`);
    await handleApplyTheme(null, themeToApply);

    // Apply dynamic wallpaper if enabled
    if (prefs.dynamicWallpaper?.enabled) {
      logger.info(`Dynamic wallpaper enabled, applying ${appearance} wallpaper for theme: ${themeToApply}`);
      await applyDynamicWallpaper(appearance, themeToApply);
    }

    // Show notification if enabled (use onScheduledSwitch for system appearance changes)
    const shouldShowNotification = prefs.notifications?.onScheduledSwitch ?? prefs.showNotifications ?? true;
    if (Notification.isSupported() && shouldShowNotification) {
      const notification = new Notification({
        title: 'Theme Auto-Switched',
        body: `Switched to ${appearance} theme: ${themeToApply}`,
        silent: false,
      });
      notification.show();
    }
  } catch (error) {
    logger.error('Error handling appearance change:', error);
  }
}

/**
 * Check schedule and apply theme if needed
 * Called periodically to check if theme should switch based on schedule
 */
export async function checkScheduleAndApplyTheme(): Promise<void> {
  try {
    // Get preferences to check if schedule-based auto-switching is enabled
    const prefs = await handleGetPreferences();

    // Check if auto-switching based on schedule is enabled
    if (!prefs.autoSwitch?.enabled || prefs.autoSwitch?.mode !== 'schedule') {
      return;
    }

    // Check if schedule is configured
    if (!prefs.schedule?.light || !prefs.schedule?.dark) {
      logger.warn('Schedule times not configured');
      return;
    }

    // Get current time
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    // Parse schedule times (format: "HH:MM")
    const lightTimeParts = prefs.schedule.light.split(':');
    const lightTimeMinutes = parseInt(lightTimeParts[0]) * 60 + parseInt(lightTimeParts[1]);

    const darkTimeParts = prefs.schedule.dark.split(':');
    const darkTimeMinutes = parseInt(darkTimeParts[0]) * 60 + parseInt(darkTimeParts[1]);

    // Determine which theme should be active based on current time
    let shouldUseDarkTheme: boolean;

    if (lightTimeMinutes < darkTimeMinutes) {
      // Normal case: light time is in the morning, dark time is in the evening
      // Example: light at 06:00, dark at 18:00
      shouldUseDarkTheme = currentTimeMinutes >= darkTimeMinutes || currentTimeMinutes < lightTimeMinutes;
    } else {
      // Inverted case: light time is after dark time (crossing midnight)
      // Example: light at 18:00, dark at 06:00
      shouldUseDarkTheme = currentTimeMinutes >= darkTimeMinutes && currentTimeMinutes < lightTimeMinutes;
    }

    // Get the appropriate theme
    const themeToApply = shouldUseDarkTheme
      ? prefs.defaultDarkTheme
      : prefs.defaultLightTheme;

    if (!themeToApply) {
      logger.warn(`No default ${shouldUseDarkTheme ? 'dark' : 'light'} theme configured`);
      return;
    }

    // Get current state to avoid unnecessary theme switches
    const state = await handleGetState();
    if (state.currentTheme === themeToApply) {
      // Already using the correct theme
      return;
    }

    // Apply the theme
    logger.info(`Schedule-based auto-switching to ${shouldUseDarkTheme ? 'dark' : 'light'} theme: ${themeToApply}`);
    await handleApplyTheme(null, themeToApply);

    // Show notification if enabled
    const shouldShowNotification = prefs.notifications?.onScheduledSwitch ?? prefs.showNotifications ?? true;
    if (Notification.isSupported() && shouldShowNotification) {
      const notification = new Notification({
        title: 'Theme Auto-Switched',
        body: `Scheduled switch to ${themeToApply}`,
        silent: false,
      });
      notification.show();
    }
  } catch (error) {
    logger.error('Error checking schedule:', error);
  }
}

/**
 * Calculate sunrise and sunset times for a given location and date
 * Uses a simplified algorithm based on NOAA calculations
 * Returns times in local timezone
 */
function calculateSunTimes(lat: number, lon: number, date: Date = new Date()): { sunrise: Date; sunset: Date } {
  // Get the day of year
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  // Fractional year in radians
  const gamma = (2 * Math.PI / 365) * (dayOfYear - 1);

  // Equation of time in minutes
  const eqtime = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));

  // Solar declination angle in radians
  const decl = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);

  // Convert latitude to radians
  const lat_rad = lat * Math.PI / 180;

  // Hour angle in radians
  const cos_ha = (Math.cos(90.833 * Math.PI / 180) / (Math.cos(lat_rad) * Math.cos(decl)))
    - (Math.tan(lat_rad) * Math.tan(decl));

  // Check if sun never rises or sets (polar regions)
  if (cos_ha > 1 || cos_ha < -1) {
    const sunrise = new Date(date);
    sunrise.setHours(6, 0, 0, 0);
    const sunset = new Date(date);
    sunset.setHours(18, 0, 0, 0);
    return { sunrise, sunset };
  }

  const ha = Math.acos(cos_ha);

  // Calculate sunrise and sunset times in minutes from midnight UTC
  const sunrise_time = 720 - 4 * (lon + ha * 180 / Math.PI) - eqtime;
  const sunset_time = 720 - 4 * (lon - ha * 180 / Math.PI) - eqtime;

  // Get timezone offset in minutes
  const timezoneOffset = date.getTimezoneOffset();

  // Adjust for local timezone
  const sunrise_local = sunrise_time - timezoneOffset;
  const sunset_local = sunset_time - timezoneOffset;

  // Convert to hours and minutes, handling day wraparound
  const sunrise = new Date(date);
  let sunrise_hours = Math.floor(sunrise_local / 60);
  let sunrise_mins = Math.floor(sunrise_local % 60);
  if (sunrise_hours < 0) sunrise_hours += 24;
  if (sunrise_hours >= 24) sunrise_hours -= 24;
  sunrise.setHours(sunrise_hours, sunrise_mins, 0, 0);

  const sunset = new Date(date);
  let sunset_hours = Math.floor(sunset_local / 60);
  let sunset_mins = Math.floor(sunset_local % 60);
  if (sunset_hours < 0) sunset_hours += 24;
  if (sunset_hours >= 24) sunset_hours -= 24;
  sunset.setHours(sunset_hours, sunset_mins, 0, 0);

  return { sunrise, sunset };
}

/**
 * Get user's location using macOS Core Location (via shell command)
 * Returns latitude and longitude
 */
async function getUserLocation(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    // Use CoreLocationCLI if available, otherwise fall back to IP-based geolocation
    // For now, we'll use a simple AppleScript to get timezone and make an educated guess
    // In production, you'd want to use a proper Core Location wrapper

    // Try to get location using whereami if installed
    const execAsync = promisify(exec);
    try {
      const { stdout } = await execAsync('which whereami');
      if (stdout.trim()) {
        const { stdout: locationData } = await execAsync('whereami -f json');
        const location = JSON.parse(locationData);
        return {
          latitude: location.latitude,
          longitude: location.longitude
        };
      }
    } catch (e) {
      // whereami not installed, fall through to default
    }

    // Default to San Francisco coordinates if we can't get location
    // In a production app, you'd prompt the user or use a better fallback
    logger.warn('Could not determine user location, using San Francisco as default');
    return {
      latitude: 37.7749,
      longitude: -122.4194
    };
  } catch (error) {
    logger.error('Error getting user location:', error);
    return null;
  }
}

/**
 * Handle getting sunrise/sunset times
 */
async function handleGetSunriseSunset(): Promise<{ sunrise: string; sunset: string; location: string } | null> {
  try {
    const location = await getUserLocation();
    if (!location) {
      return null;
    }

    const times = calculateSunTimes(location.latitude, location.longitude);

    // Format times as HH:MM strings
    // The times are in UTC, so we display them in local time
    const formatTime = (date: Date) => {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    };

    return {
      sunrise: formatTime(times.sunrise),
      sunset: formatTime(times.sunset),
      location: `${location.latitude.toFixed(2)}°, ${location.longitude.toFixed(2)}°`
    };
  } catch (error) {
    logger.error('Error calculating sunrise/sunset:', error);
    return null;
  }
}

/**
 * Get current application state
 */
async function handleGetState(): Promise<State> {
  ensureDirectories();
  ensureState();
  const statePath = getStatePath();
  const stateContent = fs.readFileSync(statePath, 'utf-8');
  return JSON.parse(stateContent);
}

/**
 * Save UI state for crash recovery
 * Saves the current view, filters, search query, etc.
 */
async function handleSaveUIState(_event: any, uiState: any): Promise<void> {
  try {
    const uiStatePath = getUIStatePath();
    const stateToSave = {
      ...uiState,
      timestamp: Date.now(),
    };
    fs.writeFileSync(uiStatePath, JSON.stringify(stateToSave, null, 2));
    logger.debug('UI state saved for crash recovery', stateToSave);
  } catch (error) {
    logger.error('Failed to save UI state', error);
    // Don't throw - we don't want UI state saving to break the app
  }
}

/**
 * Get saved UI state for crash recovery
 * Returns null if no saved state exists or if it's too old (>24 hours)
 */
async function handleGetUIState(): Promise<any | null> {
  try {
    const uiStatePath = getUIStatePath();

    if (!existsSync(uiStatePath)) {
      logger.debug('No UI state file found');
      return null;
    }

    const stateContent = fs.readFileSync(uiStatePath, 'utf-8');
    const uiState = JSON.parse(stateContent);

    // Check if state is not too old (24 hours = 86400000 ms)
    const stateAge = Date.now() - (uiState.timestamp || 0);
    if (stateAge > 86400000) {
      logger.info('UI state is too old, ignoring', { ageHours: Math.round(stateAge / 3600000) });
      // Delete old state file
      fs.unlinkSync(uiStatePath);
      return null;
    }

    logger.debug('UI state restored from crash recovery', uiState);
    return uiState;
  } catch (error) {
    logger.error('Failed to load UI state', error);
    return null;
  }
}

/**
 * Get the logging directory path
 */
async function handleGetLogDirectory(): Promise<string> {
  return logger.getLogDirectory();
}

/**
 * Get the main log file path
 */
async function handleGetLogFile(): Promise<string> {
  return logger.getLogFile();
}

/**
 * Clear all log files
 */
async function handleClearLogs(): Promise<void> {
  logger.clearLogs();
}

/**
 * Enable or disable debug logging
 */
async function handleSetDebugEnabled(_event: any, enabled: boolean): Promise<void> {
  logger.setDebugEnabled(enabled);

  // Also update preferences
  try {
    const prefsPath = getPreferencesPath();
    const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf-8'));
    prefs.debugLogging = enabled;
    fs.writeFileSync(prefsPath, JSON.stringify(prefs, null, 2));
  } catch (err) {
    logger.error('Failed to update debug logging preference', err);
  }
}

/**
 * Check if debug logging is enabled
 */
async function handleIsDebugEnabled(): Promise<boolean> {
  return logger.isDebugEnabled();
}

/**
 * Check for application updates
 */
async function handleCheckForUpdates(): Promise<{
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  updateUrl?: string;
  error?: string;
}> {
  try {
    // Get current version from package.json
    const packageJsonPath = path.join(__dirname, '../../package.json');
    let currentVersion = '0.1.0';

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      currentVersion = packageJson.version;
    } catch (err) {
      logger.error('Failed to read current version', err);
    }

    logger.info(`Checking for updates. Current version: ${currentVersion}`);

    // For now, simulate checking for updates
    // In a real implementation, this would:
    // 1. Fetch latest release from GitHub API
    // 2. Compare versions using semver
    // 3. Return update information

    // Simulated response - always return "up to date"
    return {
      currentVersion,
      latestVersion: currentVersion,
      hasUpdate: false,
      updateUrl: 'https://github.com/mactheme/mactheme/releases'
    };

    /* Example real implementation:
    const response = await fetch('https://api.github.com/repos/username/mactheme/releases/latest');
    const data = await response.json();
    const latestVersion = data.tag_name.replace('v', '');

    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;

    return {
      currentVersion,
      latestVersion,
      hasUpdate,
      updateUrl: data.html_url
    };
    */
  } catch (error) {
    logger.error('Error checking for updates', error);
    return {
      currentVersion: '0.1.0',
      latestVersion: '0.1.0',
      hasUpdate: false,
      error: 'Failed to check for updates: ' + (error as Error).message
    };
  }
}

/**
 * Wallpaper Scheduler Service
 * Automatically applies wallpapers based on time of day schedules
 */
let wallpaperSchedulerInterval: NodeJS.Timeout | null = null;

/**
 * Start the wallpaper scheduler
 */
export function startWallpaperScheduler(): void {
  // Clear existing interval if any
  if (wallpaperSchedulerInterval) {
    clearInterval(wallpaperSchedulerInterval);
  }

  // Check every minute
  wallpaperSchedulerInterval = setInterval(async () => {
    try {
      await checkAndApplyScheduledWallpaper();
    } catch (error) {
      logger.error('Error in wallpaper scheduler', error);
    }
  }, 60000); // 60000ms = 1 minute

  // Run immediately on start
  checkAndApplyScheduledWallpaper().catch(error => {
    logger.error('Error in initial wallpaper scheduler check', error);
  });

  logger.info('Wallpaper scheduler started');
}

/**
 * Stop the wallpaper scheduler
 */
export function stopWallpaperScheduler(): void {
  if (wallpaperSchedulerInterval) {
    clearInterval(wallpaperSchedulerInterval);
    wallpaperSchedulerInterval = null;
    logger.info('Wallpaper scheduler stopped');
  }
}

/**
 * Check if a wallpaper should be applied based on current time and schedules
 */
async function checkAndApplyScheduledWallpaper(): Promise<void> {
  try {
    // Get preferences
    const prefs = await handleGetPreferences();

    // Check if wallpaper scheduling is enabled
    if (!prefs.wallpaperSchedule?.enabled || !prefs.wallpaperSchedule.schedules.length) {
      return;
    }

    // Get current time in HH:MM format
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    logger.debug(`Checking wallpaper schedule at ${currentTime}`);

    // Find the active schedule for current time
    for (const schedule of prefs.wallpaperSchedule.schedules) {
      if (isTimeInRange(currentTime, schedule.timeStart, schedule.timeEnd)) {
        // Check if this wallpaper is already applied
        const state = await handleGetState();
        if (state.currentWallpaper === schedule.wallpaperPath) {
          logger.debug(`Scheduled wallpaper already applied: ${schedule.wallpaperPath}`);
          return;
        }

        // Apply the scheduled wallpaper
        logger.info(`Applying scheduled wallpaper: ${schedule.wallpaperPath} (${schedule.name || 'Unnamed'})`);
        await handleApplyWallpaper(null, schedule.wallpaperPath);

        // Show notification if enabled
        if (prefs.notifications?.onScheduledSwitch) {
          const { Notification } = await import('electron');
          const notification = new Notification({
            title: 'Scheduled Wallpaper Applied',
            body: `Applied ${schedule.name || 'wallpaper'} for ${schedule.timeStart} - ${schedule.timeEnd}`,
          });
          notification.show();
        }

        return; // Exit after applying the first matching schedule
      }
    }

    logger.debug('No matching wallpaper schedule found for current time');
  } catch (error) {
    logger.error('Error checking scheduled wallpaper', error);
  }
}

/**
 * Check if current time is within a time range
 * Supports ranges that cross midnight (e.g., 22:00 - 06:00)
 */
function isTimeInRange(currentTime: string, startTime: string, endTime: string): boolean {
  const toMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const current = toMinutes(currentTime);
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);

  if (start <= end) {
    // Normal range (e.g., 06:00 - 18:00)
    return current >= start && current < end;
  } else {
    // Range crosses midnight (e.g., 22:00 - 06:00)
    return current >= start || current < end;
  }
}
