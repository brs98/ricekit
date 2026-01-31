/**
 * Theme IPC Handlers
 * Handles theme listing, applying, creating, updating, deleting, importing, and exporting
 */
import { ipcMain, Notification, dialog, BrowserWindow, IpcMainInvokeEvent } from 'electron';
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
  getCurrentDir,
  ensureDirectories,
  ensurePreferences,
  ensureState,
  getDefaultPreferences,
} from '../directories';
import type { Theme, ThemeMetadata, ThemeColors, Preferences, State } from '../../shared/types';
import { createError, getErrorMessage, isNodeError } from '../../shared/errors';
import { logger } from '../logger';
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
  isExecutable,
  stat,
  createSymlink,
} from '../utils/asyncFs';
import { handleListWallpapers, handleApplyWallpaper } from './wallpaperHandlers';
import type { ApplyOptions } from './systemHandlers';
import { handleGetPreferences, handleSetPreferences } from './preferencesHandlers';
import { isEditorSettings } from '../../shared/validation';

/**
 * Theme name mapping for VS Code and Cursor
 * Maps Flowstate internal names to VS Code/Cursor theme extension names
 */
const editorThemeNameMapping: Record<string, string> = {
  'tokyo-night': 'Tokyo Night',
  'catppuccin-mocha': 'Catppuccin Mocha',
  'catppuccin-latte': 'Catppuccin Latte',
  'gruvbox-dark': 'Gruvbox Dark Hard',
  'gruvbox-light': 'Gruvbox Light Hard',
  nord: 'Nord',
  dracula: 'Dracula',
  'one-dark': 'One Dark Pro',
  'solarized-dark': 'Solarized Dark',
  'solarized-light': 'Solarized Light',
  'rose-pine': 'Rosé Pine',
};

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
  } catch (error: unknown) {
    logger.error(`Error loading theme ${themeName}:`, getErrorMessage(error));
    return null;
  }
}

/**
 * List all available themes
 */
async function handleListThemes(): Promise<Theme[]> {
  const themesDir = getThemesDir();
  const customThemesDir = getCustomThemesDir();

  // Helper to load themes from a directory
  async function loadThemesFromDir(dir: string, isCustom: boolean): Promise<Theme[]> {
    if (!existsSync(dir)) return [];

    const themeNames = await readDir(dir);
    const themePromises = themeNames.map(async (themeName) => {
      const themePath = path.join(dir, themeName);
      if (await isDirectory(themePath)) {
        return loadTheme(themePath, themeName, isCustom);
      }
      return null;
    });

    const results = await Promise.all(themePromises);
    return results.filter((theme): theme is Theme => theme !== null);
  }

  // Load bundled and custom themes in parallel
  const [bundledThemes, customThemes] = await Promise.all([
    loadThemesFromDir(themesDir, false),
    loadThemesFromDir(customThemesDir, true),
  ]);

  const themes = [...bundledThemes, ...customThemes];
  logger.debug(`Loaded ${themes.length} themes`);
  return themes;
}

/**
 * Get a specific theme by name
 */
export async function handleGetTheme(_event: IpcMainInvokeEvent | null, name: string): Promise<Theme | null> {
  const themes = await handleListThemes();
  return themes.find((t) => t.name === name) || null;
}

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

/**
 * Notify running terminal applications to reload their themes
 */
async function notifyTerminalsToReload(themePath: string): Promise<void> {
  logger.debug('Notifying terminals to reload themes...');

  // Get the colors from the theme for Kitty
  const themeJsonPath = path.join(themePath, 'theme.json');
  let themeColors: ThemeColors | null = null;

  try {
    const themeData = await readJson<ThemeMetadata>(themeJsonPath);
    themeColors = themeData.colors;
  } catch (err: unknown) {
    logger.error('Failed to read theme colors:', getErrorMessage(err));
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
        exec(kittyCommand, (error, _stdout, _stderr) => {
          if (error) {
            logger.info('Kitty not available or remote control disabled:', error.message);
          } else {
            logger.info('✓ Kitty terminal reloaded successfully');
          }
        });
      }
    }
  } catch (err: unknown) {
    logger.info('Could not notify Kitty:', getErrorMessage(err));
  }

  // 2. Notify iTerm2 using AppleScript
  // Note: iTerm2 AppleScript only works when the app is running
  try {
    const iterm2ConfigPath = path.join(themePath, 'iterm2.itermcolors');
    if (existsSync(iterm2ConfigPath)) {
      // First check if iTerm2 is running to avoid noisy errors
      let iterm2Running = false;
      try {
        execSync('pgrep -x iTerm2', { stdio: 'pipe' });
        iterm2Running = true;
      } catch {
        // iTerm2 not running - skip silently
      }

      if (iterm2Running) {
        // AppleScript to reload iTerm2 profile
        const appleScriptCommand = `osascript -e 'tell application "iTerm2"' -e 'tell current session of current window' -e 'set foreground color to {0, 0, 0}' -e 'set background color to {65535, 65535, 65535}' -e 'end tell' -e 'end tell'`;

        exec(appleScriptCommand, (error, _stdout, _stderr) => {
          if (error) {
            logger.info('iTerm2 notification failed:', error.message);
          } else {
            logger.info('✓ iTerm2 reloaded (profile refresh triggered)');
          }
        });
      }
    }
  } catch (err: unknown) {
    logger.info('Could not notify iTerm2:', getErrorMessage(err));
  }

  // Note: Alacritty auto-reloads when config changes (watches config file)
  // Note: Warp requires manual reload
  // Note: Hyper auto-reloads when .hyper.js changes

  // 3. Notify WezTerm by updating the theme file directly
  // WezTerm watches files added to config_reload_watch_list
  // We write the theme content to a fixed location that WezTerm watches
  try {
    const weztermThemeSrc = path.join(themePath, 'wezterm.lua');
    const weztermThemeDest = path.join(os.homedir(), 'Library', 'Application Support', 'Flowstate', 'wezterm-colors.lua');

    if (existsSync(weztermThemeSrc)) {
      // Copy theme content to the fixed location (this triggers WezTerm's file watcher)
      await copyFile(weztermThemeSrc, weztermThemeDest);
      logger.info('✓ WezTerm theme file updated - will auto-reload');
    }
  } catch (err: unknown) {
    logger.info('Could not notify WezTerm:', getErrorMessage(err));
  }

  // 4. Reload SketchyBar
  // Add a small delay to ensure the symlink is fully visible to SketchyBar
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Find sketchybar binary - in production, PATH doesn't include Homebrew
  const sketchybarPaths = ['/opt/homebrew/bin/sketchybar', '/usr/local/bin/sketchybar'];
  const sketchybarBin = sketchybarPaths.find((p) => existsSync(p));

  if (!sketchybarBin) {
    logger.info('SketchyBar not installed, skipping reload');
  } else {
    // Check if SketchyBar is running first
    let sketchybarRunning = false;
    try {
      execSync('pgrep -x sketchybar', { stdio: 'pipe' });
      sketchybarRunning = true;
    } catch {
      // Not running
    }

    if (sketchybarRunning) {
      // Try reload with retry logic for intermittent failures
      let reloadSuccess = false;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          execSync(`"${sketchybarBin}" --reload`, {
            stdio: 'pipe',
            timeout: 5000,
          });
          logger.info('✓ SketchyBar reloaded');
          reloadSuccess = true;
          break;
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          logger.warn(`SketchyBar reload attempt ${attempt} failed: ${message}`);
          if (attempt < 2) {
            // Wait a bit before retrying
            await new Promise((resolve) => setTimeout(resolve, 200));
          }
        }
      }
      if (!reloadSuccess) {
        logger.error('SketchyBar reload failed after retries');
      }
    } else {
      logger.info('SketchyBar not running, skipping reload');
    }
  }

  logger.info('Terminal reload notifications sent');
}

/**
 * Update editor settings.json (VS Code or Cursor) with the current theme
 */
async function updateEditorSettings(
  editorName: string,
  settingsPath: string,
  themeName: string,
  _themePath: string
): Promise<void> {
  logger.info(`Updating ${editorName} settings.json...`);

  try {
    const settingsDir = path.dirname(settingsPath);

    // Check if settings file exists
    if (!existsSync(settingsPath)) {
      logger.info(`${editorName} settings.json not found, creating it...`);
      if (!existsSync(settingsDir)) {
        await ensureDir(settingsDir);
      }
      // Create empty settings file
      await writeFile(settingsPath, '{}');
    }

    // Read current settings
    let settings: Record<string, unknown> = {};
    try {
      const settingsContent = await readFile(settingsPath);
      // Handle empty file or invalid JSON
      if (settingsContent.trim()) {
        const parsed: unknown = JSON.parse(settingsContent);
        if (isEditorSettings(parsed)) {
          settings = parsed;
        } else {
          logger.warn(`${editorName} settings.json is not a valid object, starting with empty object`);
        }
      }
    } catch (parseError: unknown) {
      logger.warn(`Failed to parse ${editorName} settings.json, starting with empty object:`, getErrorMessage(parseError));
      settings = {};
    }

    // Get the editor theme name from mapping
    const editorThemeName = editorThemeNameMapping[themeName] || 'Default Dark+';

    // Update the theme setting
    settings['workbench.colorTheme'] = editorThemeName;

    // Write back the settings file with formatting
    await writeJson(settingsPath, settings);
    logger.info(`✓ ${editorName} theme updated to: ${editorThemeName}`);
  } catch (error: unknown) {
    logger.error(`Failed to update ${editorName} settings:`, getErrorMessage(error));
    // Don't throw - this is a non-critical error
  }
}

/**
 * Update VS Code settings.json with the current theme
 */
export async function updateVSCodeSettings(themeName: string, themePath: string): Promise<void> {
  const homeDir = os.homedir();
  const vscodeSettingsPath = path.join(homeDir, 'Library', 'Application Support', 'Code', 'User', 'settings.json');
  await updateEditorSettings('VS Code', vscodeSettingsPath, themeName, themePath);
}

/**
 * Update Cursor settings.json with the current theme
 */
export async function updateCursorSettings(themeName: string, themePath: string): Promise<void> {
  const homeDir = os.homedir();
  const cursorSettingsPath = path.join(homeDir, 'Library', 'Application Support', 'Cursor', 'User', 'settings.json');
  await updateEditorSettings('Cursor', cursorSettingsPath, themeName, themePath);
}

/**
 * Refresh all apps when the active theme is updated
 * This applies the updated theme to all integrated apps without changing the active theme state
 */
async function refreshActiveThemeApps(themeName: string, themePath: string): Promise<void> {
  logger.info(`Refreshing apps for updated active theme: ${themeName}`);

  // Load preferences to check which apps are enabled
  const prefsPath = getPreferencesPath();
  let prefs: Preferences;
  try {
    prefs = await readJson<Preferences>(prefsPath);
  } catch (err: unknown) {
    logger.error('Failed to read preferences for theme refresh:', getErrorMessage(err));
    prefs = getDefaultPreferences();
  }

  // Update UI (tray menu, window title, notify renderer)
  try {
    const { refreshTrayMenu, updateWindowTitle, notifyRendererThemeChanged } = await import('../main');
    refreshTrayMenu();
    updateWindowTitle(themeName);
    notifyRendererThemeChanged(themeName);
  } catch (err: unknown) {
    logger.error('Failed to update UI after theme update:', getErrorMessage(err));
  }

  // Update VS Code settings if enabled
  try {
    if (prefs.enabledApps && prefs.enabledApps.includes('vscode')) {
      await updateVSCodeSettings(themeName, themePath);
    }
  } catch (err: unknown) {
    logger.error('Failed to update VS Code settings:', getErrorMessage(err));
  }

  // Update Cursor settings if enabled
  try {
    if (prefs.enabledApps && prefs.enabledApps.includes('cursor')) {
      await updateCursorSettings(themeName, themePath);
    }
  } catch (err: unknown) {
    logger.error('Failed to update Cursor settings:', getErrorMessage(err));
  }

  // Notify terminals to reload
  try {
    await notifyTerminalsToReload(themePath);
  } catch (err: unknown) {
    logger.error('Failed to notify terminals:', getErrorMessage(err));
  }

  // Execute hook script if configured
  try {
    if (prefs.hookScript && prefs.hookScript.trim() !== '') {
      await executeHookScript(themeName, prefs.hookScript);
    }
  } catch (err: unknown) {
    logger.error('Failed to execute hook script:', getErrorMessage(err));
  }

  // Update AeroSpace/JankyBorders if enabled
  try {
    const isAerospaceEnabled =
      !prefs.enabledApps || prefs.enabledApps.length === 0 || prefs.enabledApps.includes('aerospace');
    if (isAerospaceEnabled) {
      const bordersScript = path.join(themePath, 'aerospace-borders.sh');
      if (existsSync(bordersScript)) {
        execSync(`bash "${bordersScript}"`, {
          shell: '/bin/bash',
          stdio: 'pipe',
          timeout: 5000,
        });
        logger.info('AeroSpace/JankyBorders theme applied');
      }
    }
  } catch (err: unknown) {
    logger.error('Failed to apply AeroSpace/JankyBorders:', getErrorMessage(err));
  }

  logger.info(`Finished refreshing apps for theme: ${themeName}`);
}

/**
 * Apply a theme
 */
export async function handleApplyTheme(_event: IpcMainInvokeEvent | null, name: string, options?: ApplyOptions): Promise<void> {
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
        if (await isSymlink(symlinkPath)) {
          await unlink(symlinkPath);
          logger.info(`Removed existing symlink: ${symlinkPath}`);
        } else if (await isDirectory(symlinkPath)) {
          // If it's a directory (shouldn't happen), remove it
          await rmdir(symlinkPath);
          logger.info(`Removed existing directory: ${symlinkPath}`);
        }
      }
    } catch (err: unknown) {
      if (isNodeError(err) && (err.code === 'EACCES' || err.code === 'EPERM')) {
        throw createError(
          'PERMISSION_ERROR',
          "Flowstate doesn't have permission to modify theme files. Please check folder permissions."
        );
      }
      throw err;
    }

    // Create new symlink
    try {
      await createSymlink(theme.path, symlinkPath, 'dir');
      logger.debug(`Created symlink: ${symlinkPath} -> ${theme.path}`);
    } catch (err: unknown) {
      logger.error('Failed to create symlink:', getErrorMessage(err));
      if (isNodeError(err)) {
        if (err.code === 'EACCES' || err.code === 'EPERM') {
          throw createError(
            'PERMISSION_ERROR',
            'Cannot create theme link due to insufficient permissions. Please check folder permissions in ~/Library/Application Support/Flowstate.'
          );
        } else if (err.code === 'EEXIST') {
          throw createError(
            'FILE_EXISTS',
            'A file or folder already exists at the theme location. Please remove it and try again.'
          );
        } else if (err.code === 'ENOSPC') {
          throw createError('NO_SPACE', 'Not enough disk space to apply theme.');
        }
      }
      const message = err instanceof Error ? err.message : String(err);
      throw createError('SYMLINK_ERROR', `Failed to create theme link: ${message}`);
    }

    // Update state
    const statePath = getStatePath();
    let state: State;
    try {
      state = await readJson<State>(statePath);
    } catch (err: unknown) {
      if (isNodeError(err) && (err.code === 'EACCES' || err.code === 'EPERM')) {
        throw createError(
          'PERMISSION_ERROR',
          'Cannot read app state file. Please check permissions for ~/Library/Application Support/Flowstate.'
        );
      }
      throw err;
    }

    state.currentTheme = name;
    state.lastSwitched = Date.now();

    try {
      await writeJson(statePath, state);
    } catch (err: unknown) {
      if (isNodeError(err)) {
        if (err.code === 'EACCES' || err.code === 'EPERM') {
          throw createError(
            'PERMISSION_ERROR',
            'Cannot save app state. Please check write permissions for ~/Library/Application Support/Flowstate.'
          );
        } else if (err.code === 'ENOSPC') {
          throw createError('NO_SPACE', 'Not enough disk space to save theme state.');
        }
      }
      throw err;
    }

    // Update recent themes in preferences
    const prefsPath = getPreferencesPath();
    let prefs: Preferences;
    try {
      prefs = await readJson<Preferences>(prefsPath);
    } catch (err: unknown) {
      if (isNodeError(err) && (err.code === 'EACCES' || err.code === 'EPERM')) {
        throw createError(
          'PERMISSION_ERROR',
          'Cannot read preferences. Please check permissions for ~/Library/Application Support/Flowstate.'
        );
      }
      throw err;
    }

    // Add to recent themes (remove if already exists to avoid duplicates)
    if (!prefs.recentThemes) {
      prefs.recentThemes = [];
    }
    prefs.recentThemes = prefs.recentThemes.filter((t) => t !== name);
    prefs.recentThemes.unshift(name); // Add to beginning

    // Keep only last 10 recent themes
    if (prefs.recentThemes.length > 10) {
      prefs.recentThemes = prefs.recentThemes.slice(0, 10);
    }

    try {
      await writeJson(prefsPath, prefs);
    } catch (err: unknown) {
      // Don't fail the theme application if we can't update preferences
      logger.error('Failed to update preferences:', getErrorMessage(err));
    }

    // If this is a manual apply (not from scheduler), disable scheduling
    if (!options?.fromScheduler) {
      try {
        const currentPrefs = await handleGetPreferences();
        if (currentPrefs.schedule?.enabled) {
          logger.info('Manual theme apply detected, disabling scheduling');
          await handleSetPreferences(null, {
            ...currentPrefs,
            schedule: {
              ...currentPrefs.schedule,
              enabled: false,
            },
          });
        }
      } catch (err: unknown) {
        logger.error('Failed to disable scheduling after manual apply:', getErrorMessage(err));
      }
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

    // Update tray menu with new recent themes and notify renderer of theme change
    try {
      const { refreshTrayMenu, updateWindowTitle, notifyRendererThemeChanged } = await import('../main');
      refreshTrayMenu();
      updateWindowTitle(name);
      notifyRendererThemeChanged(name);
    } catch (err: unknown) {
      logger.error('Failed to update UI after theme change:', getErrorMessage(err));
    }

    // Update VS Code settings if enabled
    try {
      if (prefs.enabledApps && prefs.enabledApps.includes('vscode')) {
        await updateVSCodeSettings(name, theme.path);
      } else {
        logger.info('VS Code integration disabled in preferences');
      }
    } catch (err: unknown) {
      logger.error('Failed to update VS Code settings:', getErrorMessage(err));
    }

    // Update Cursor settings if enabled
    try {
      if (prefs.enabledApps && prefs.enabledApps.includes('cursor')) {
        await updateCursorSettings(name, theme.path);
      } else {
        logger.info('Cursor integration disabled in preferences');
      }
    } catch (err: unknown) {
      logger.error('Failed to update Cursor settings:', getErrorMessage(err));
    }

    // Notify terminal applications to reload themes
    try {
      await notifyTerminalsToReload(theme.path);
    } catch (err: unknown) {
      logger.error('Failed to notify terminals:', getErrorMessage(err));
    }

    // Execute user-defined hook script if configured
    try {
      if (prefs.hookScript && prefs.hookScript.trim() !== '') {
        await executeHookScript(name, prefs.hookScript);
      } else {
        logger.info('No hook script configured');
      }
    } catch (err: unknown) {
      logger.error('Failed to execute hook script:', getErrorMessage(err));
      // Don't throw - hook script failure shouldn't block theme application
    }

    // Update AeroSpace/JankyBorders if enabled
    try {
      const isAerospaceEnabled =
        !prefs.enabledApps || prefs.enabledApps.length === 0 || prefs.enabledApps.includes('aerospace');
      if (isAerospaceEnabled) {
        const bordersScript = path.join(theme.path, 'aerospace-borders.sh');
        if (existsSync(bordersScript)) {
          // The script handles both cases: kills borders if running, then starts fresh
          execSync(`bash "${bordersScript}"`, {
            shell: '/bin/bash',
            stdio: 'pipe',
            timeout: 5000,
          });
          logger.info('AeroSpace/JankyBorders theme applied');
        }
      }
    } catch (err: unknown) {
      logger.error('Failed to apply AeroSpace/JankyBorders:', getErrorMessage(err));
      // Don't throw - borders failure shouldn't block theme application
    }

    // Automatically apply the first wallpaper from the theme
    // Pass fromScheduler: true because this wallpaper is part of theme application,
    // not a separate manual wallpaper change
    try {
      const wallpapers = await handleListWallpapers(null, name);
      const firstWallpaper = wallpapers[0];
      if (firstWallpaper) {
        logger.info(`Automatically applying first wallpaper: ${firstWallpaper}`);
        await handleApplyWallpaper(null, firstWallpaper, undefined, { fromScheduler: true });
      } else {
        logger.info('No wallpapers found in theme, skipping automatic wallpaper');
      }
    } catch (err: unknown) {
      logger.error('Failed to apply automatic wallpaper:', getErrorMessage(err));
      // Don't throw - wallpaper failure shouldn't block theme application
    }
  } catch (err: unknown) {
    // Log the full error for debugging
    logger.error('Error applying theme:', getErrorMessage(err));

    // Re-throw with user-friendly message
    const message = getErrorMessage(err);
    if (message && message.includes(':')) {
      // Already formatted error (e.g., "PERMISSION_ERROR: ...")
      throw err;
    } else {
      // Generic error - wrap it
      throw new Error(`UNEXPECTED_ERROR: Failed to apply theme: ${message || 'Unknown error'}`);
    }
  }
}

/**
 * Create a new custom theme
 */
async function handleCreateTheme(_event: IpcMainInvokeEvent, data: ThemeMetadata): Promise<void> {
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
  const { generateThemeConfigFiles } = await import('../themeInstaller');

  // Generate all config files
  await generateThemeConfigFiles(themeDir, data);

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
async function handleUpdateTheme(_event: IpcMainInvokeEvent, name: string, data: ThemeMetadata): Promise<void> {
  logger.info(`Updating theme: ${name}`);

  try {
    // Only allow updating custom themes
    const customThemesDir = getCustomThemesDir();

    // Create safe directory name from the theme name
    const themeDirName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const themeDir = path.join(customThemesDir, themeDirName);

    // Check if theme exists in custom themes directory
    if (!existsSync(themeDir)) {
      throw createError(
        'THEME_NOT_FOUND',
        'Theme not found in custom themes directory. Only custom themes can be updated.'
      );
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
    const { generateThemeConfigFiles } = await import('../themeInstaller');

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
      'theme.json',
    ];

    for (const file of configFiles) {
      const filePath = path.join(themeDir, file);
      if (existsSync(filePath)) {
        await unlink(filePath);
      }
    }

    // Regenerate all config files with the updated metadata
    await generateThemeConfigFiles(themeDir, updatedMetadata);

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

    // If this is the currently active theme, refresh all apps to apply the changes
    const statePath = getStatePath();
    const state = await readJson<State>(statePath);
    if (state.currentTheme === name) {
      logger.info('Updated theme is currently active, refreshing all apps...');
      await refreshActiveThemeApps(name, themeDir);
    }
  } catch (error: unknown) {
    logger.error('Error updating theme:', getErrorMessage(error));
    throw error;
  }
}

/**
 * Delete a custom theme
 */
async function handleDeleteTheme(_event: IpcMainInvokeEvent, name: string): Promise<void> {
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
    const statePath = getStatePath();
    const state = await readJson<State>(statePath);
    if (state.currentTheme === name) {
      throw createError(
        'THEME_ACTIVE',
        'Cannot delete the currently active theme. Please switch to a different theme first.'
      );
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
  } catch (error: unknown) {
    logger.error('Error deleting theme:', getErrorMessage(error));
    throw error;
  }
}

/**
 * Duplicate a theme (creates a copy in custom-themes)
 */
async function handleDuplicateTheme(_event: IpcMainInvokeEvent, sourceThemeName: string): Promise<void> {
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
    await ensureDir(newThemeDir);

    // Copy all files from source theme
    const files = await readDir(sourceThemeDir);
    for (const file of files) {
      const sourcePath = path.join(sourceThemeDir, file);
      const destPath = path.join(newThemeDir, file);

      const fileStat = await stat(sourcePath);
      if (fileStat.isDirectory()) {
        // Recursively copy directories (like wallpapers)
        await copyDir(sourcePath, destPath);
      } else {
        await copyFile(sourcePath, destPath);
      }
    }

    // Update metadata in the copy
    const newMetadata = {
      ...sourceMetadata,
      name: newThemeName,
      author: `${sourceMetadata.author} (duplicated)`,
    };
    await writeJson(path.join(newThemeDir, 'theme.json'), newMetadata);

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
  } catch (error: unknown) {
    logger.error('Error duplicating theme:', getErrorMessage(error));
    throw error;
  }
}

/**
 * Export a theme to a file
 * If exportPath is null/undefined, shows a save dialog
 * Returns the path where the theme was exported
 */
async function handleExportTheme(_event: IpcMainInvokeEvent, name: string, exportPath?: string): Promise<string> {
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
      const allWindows = BrowserWindow.getAllWindows();
      const mainWindow = allWindows[0];

      if (!mainWindow) {
        throw createError('UNEXPECTED_ERROR', 'No window available to show export dialog');
      }

      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Export Theme',
        defaultPath: `${name}.flowstate`,
        filters: [
          { name: 'Flowstate Files', extensions: ['flowstate', 'zip'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        properties: ['createDirectory', 'showOverwriteConfirmation'],
      });

      if (result.canceled || !result.filePath) {
        throw createError('EXPORT_CANCELED', 'Export canceled');
      }

      exportPath = result.filePath;
    }

    // Ensure the export path has an extension
    if (!exportPath.endsWith('.flowstate') && !exportPath.endsWith('.zip')) {
      exportPath += '.flowstate';
    }

    // Capture final path before entering callback (TypeScript can't track narrowing across async closures)
    const finalExportPath = exportPath;

    // Create a zip archive
    await new Promise<void>((resolve, reject) => {
      const output = fs.createWriteStream(finalExportPath);
      const archive = archiver('zip', {
        zlib: { level: 9 }, // Maximum compression
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
  } catch (error: unknown) {
    logger.error('Failed to export theme:', getErrorMessage(error));
    throw error;
  }
}

/**
 * Import a theme from a file
 * If importPath is null/undefined, shows an open dialog
 */
async function handleImportTheme(_event: IpcMainInvokeEvent, importPath?: string): Promise<void> {
  logger.info(`Importing theme${importPath ? ` from ${importPath}` : ''}`);

  try {
    const execAsync = promisify(exec);

    // If no import path provided, show open dialog
    if (!importPath) {
      const allWindows = BrowserWindow.getAllWindows();
      const mainWindow = allWindows[0];

      if (!mainWindow) {
        throw createError('UNEXPECTED_ERROR', 'No window available to show import dialog');
      }

      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Import Theme',
        filters: [
          { name: 'Flowstate Files', extensions: ['flowstate', 'zip'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        properties: ['openFile'],
      });

      const selectedPath = result.filePaths?.[0];
      if (result.canceled || !selectedPath) {
        throw createError('IMPORT_CANCELED', 'Import canceled');
      }

      importPath = selectedPath;
    }

    // Validate file exists
    if (!existsSync(importPath)) {
      throw createError('FILE_NOT_FOUND', `File not found: ${importPath}`);
    }

    // Create temporary directory for extraction
    const tmpDir = path.join(os.tmpdir(), `flowstate-import-${Date.now()}`);
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
      await copyDir(extractedThemePath, destThemeDir);
      logger.info(`Theme imported to: ${destThemeDir}`);

      // Clean up temp directory
      await rmdir(tmpDir);

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
    } catch (extractError: unknown) {
      // Clean up temp directory on error
      if (existsSync(tmpDir)) {
        await rmdir(tmpDir);
      }
      throw extractError;
    }
  } catch (error: unknown) {
    logger.error('Failed to import theme:', getErrorMessage(error));
    throw error;
  }
}

/**
 * Import theme from URL
 */
async function handleImportThemeFromUrl(_event: IpcMainInvokeEvent, url: string): Promise<void> {
  logger.info(`Importing theme from URL: ${url}`);

  try {
    const https = await import('https');
    const http = await import('http');

    // Validate URL
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL provided');
    }

    // Parse URL to determine protocol
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch (error: unknown) {
      throw new Error('Invalid URL format');
    }

    // Only allow http and https protocols for security
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error('Only HTTP and HTTPS URLs are supported');
    }

    // Create temporary directory for download
    const tmpDir = path.join(os.tmpdir(), `flowstate-url-import-${Date.now()}`);
    await ensureDir(tmpDir);

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

              redirectRequest.on('error', async (err) => {
                try {
                  await unlink(downloadPath);
                } catch {
                  /* ignore */
                }
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

        request.on('error', async (err) => {
          try {
            await unlink(downloadPath);
          } catch {
            /* ignore */
          }
          reject(err);
        });

        file.on('error', async (err) => {
          try {
            await unlink(downloadPath);
          } catch {
            /* ignore */
          }
          reject(err);
        });
      });

      logger.info(`Download complete: ${downloadPath}`);

      // Verify file was downloaded and is not empty
      const downloadStats = await stat(downloadPath);
      if (downloadStats.size === 0) {
        throw new Error('Downloaded file is empty');
      }

      logger.info(`Downloaded file size: ${downloadStats.size} bytes`);

      // Use the existing import logic to process the downloaded file
      await handleImportTheme(_event, downloadPath);

      // Clean up temp directory
      await rmdir(tmpDir);

      logger.info(`Successfully imported theme from URL: ${url}`);
    } catch (downloadError: unknown) {
      // Clean up temp directory on error
      if (existsSync(tmpDir)) {
        await rmdir(tmpDir);
      }
      throw downloadError;
    }
  } catch (error: unknown) {
    logger.error('Failed to import theme from URL:', getErrorMessage(error));
    throw new Error(`Failed to import theme from URL: ${getErrorMessage(error)}`);
  }
}

/**
 * Register theme IPC handlers
 */
export function registerThemeHandlers(): void {
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
}
