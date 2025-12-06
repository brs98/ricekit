import { ipcMain, Notification, nativeTheme, dialog } from 'electron';
import fs from 'fs';
import path from 'path';
import os from 'os';
import archiver from 'archiver';
import { promisify } from 'util';
import { exec } from 'child_process';
import {
  getThemesDir,
  getCustomThemesDir,
  getPreferencesPath,
  getStatePath,
  getCurrentDir,
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
  ipcMain.handle('theme:duplicate', handleDuplicateTheme);
  ipcMain.handle('theme:export', handleExportTheme);
  ipcMain.handle('theme:import', handleImportTheme);

  // Wallpaper operations
  ipcMain.handle('wallpaper:list', handleListWallpapers);
  ipcMain.handle('wallpaper:apply', handleApplyWallpaper);
  ipcMain.handle('wallpaper:getDisplays', handleGetDisplays);

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

  // State operations
  ipcMain.handle('state:get', handleGetState);

  // Quick switcher operations
  ipcMain.handle('quickswitcher:close', async () => {
    const { BrowserWindow } = await import('electron');
    const allWindows = BrowserWindow.getAllWindows();
    const quickSwitcher = allWindows.find(win => win.getTitle() === '' && win.isAlwaysOnTop());
    if (quickSwitcher) {
      quickSwitcher.hide();
    }
  });

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
 * Notify running terminal applications to reload their themes
 */
/**
 * Execute user-defined hook script if configured
 */
async function executeHookScript(themeName: string, hookScriptPath: string): Promise<void> {
  console.log(`Executing hook script: ${hookScriptPath}`);

  // Expand ~ to home directory
  const expandedPath = hookScriptPath.startsWith('~')
    ? path.join(os.homedir(), hookScriptPath.slice(1))
    : hookScriptPath;

  // Check if hook script exists
  if (!fs.existsSync(expandedPath)) {
    console.error(`Hook script not found: ${expandedPath}`);
    throw new Error(`Hook script not found: ${expandedPath}`);
  }

  // Check if hook script is executable
  try {
    fs.accessSync(expandedPath, fs.constants.X_OK);
  } catch (err) {
    console.error(`Hook script is not executable: ${expandedPath}`);
    throw new Error(`Hook script is not executable: ${expandedPath}. Run: chmod +x ${expandedPath}`);
  }

  // Execute the hook script with theme name as argument
  return new Promise((resolve, reject) => {
    exec(`"${expandedPath}" "${themeName}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Hook script execution failed: ${error.message}`);
        console.error(`stderr: ${stderr}`);
        reject(new Error(`Hook script failed: ${error.message}`));
        return;
      }

      if (stdout) {
        console.log(`Hook script output: ${stdout.trim()}`);
      }

      if (stderr) {
        console.log(`Hook script stderr: ${stderr.trim()}`);
      }

      console.log('✓ Hook script executed successfully');
      resolve();
    });
  });
}

async function notifyTerminalsToReload(themePath: string): Promise<void> {
  console.log('Notifying terminals to reload themes...');

  // Get the colors from the theme for Kitty
  const themeJsonPath = path.join(themePath, 'theme.json');
  let themeColors: any = null;

  try {
    const themeData = JSON.parse(fs.readFileSync(themeJsonPath, 'utf-8'));
    themeColors = themeData.colors;
  } catch (err) {
    console.error('Failed to read theme colors:', err);
  }

  // 1. Notify Kitty terminal
  // Check if Kitty is running and has remote control enabled
  try {
    const kittyConfigPath = path.join(themePath, 'kitty.conf');
    if (fs.existsSync(kittyConfigPath) && themeColors) {
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
            console.log('Kitty not available or remote control disabled:', error.message);
          } else {
            console.log('✓ Kitty terminal reloaded successfully');
          }
        });
      }
    }
  } catch (err) {
    console.log('Could not notify Kitty:', err);
  }

  // 2. Notify iTerm2 using AppleScript
  try {
    const iterm2ConfigPath = path.join(themePath, 'iterm2.itermcolors');
    if (fs.existsSync(iterm2ConfigPath)) {
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
          console.log('iTerm2 not available or not running:', error.message);
        } else {
          console.log('✓ iTerm2 reloaded (profile refresh triggered)');
        }
      });
    }
  } catch (err) {
    console.log('Could not notify iTerm2:', err);
  }

  // Note: Alacritty auto-reloads when config changes (watches config file)
  // Note: Warp requires manual reload
  // Note: Hyper auto-reloads when .hyper.js changes

  console.log('Terminal reload notifications sent');
}

/**
 * Update VS Code settings.json with the current theme
 */
async function updateVSCodeSettings(themeName: string, themePath: string): Promise<void> {
  console.log('Updating VS Code settings.json...');

  try {
    const homeDir = os.homedir();
    const vscodeSettingsPath = path.join(homeDir, 'Library', 'Application Support', 'Code', 'User', 'settings.json');

    // Check if VS Code settings file exists
    if (!fs.existsSync(vscodeSettingsPath)) {
      console.log('VS Code settings.json not found, creating it...');
      const vscodeDir = path.dirname(vscodeSettingsPath);
      if (!fs.existsSync(vscodeDir)) {
        fs.mkdirSync(vscodeDir, { recursive: true });
      }
      // Create empty settings file
      fs.writeFileSync(vscodeSettingsPath, '{}', 'utf-8');
    }

    // Read current settings
    let settings: any = {};
    try {
      const settingsContent = fs.readFileSync(vscodeSettingsPath, 'utf-8');
      // Handle empty file or invalid JSON
      if (settingsContent.trim()) {
        settings = JSON.parse(settingsContent);
      }
    } catch (parseError) {
      console.warn('Failed to parse VS Code settings.json, starting with empty object:', parseError);
      settings = {};
    }

    // Map theme name to VS Code theme name
    // VS Code themes typically have specific naming conventions
    // For now, we'll use a simple mapping based on common themes
    const themeNameMapping: Record<string, string> = {
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

    // Get the VS Code theme name
    const vscodeThemeName = themeNameMapping[themeName] || 'Default Dark+';

    // Update the theme setting
    settings['workbench.colorTheme'] = vscodeThemeName;

    // Write back the settings file with formatting
    fs.writeFileSync(vscodeSettingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    console.log(`✓ VS Code theme updated to: ${vscodeThemeName}`);
  } catch (error) {
    console.error('Failed to update VS Code settings:', error);
    // Don't throw - this is a non-critical error
  }
}

/**
 * Apply a theme
 */
export async function handleApplyTheme(_event: any, name: string): Promise<void> {
  console.log(`Applying theme: ${name}`);

  // Find the theme
  const theme = await handleGetTheme(null, name);
  if (!theme) {
    throw new Error(`Theme ${name} not found`);
  }

  // Create or update symlink
  const currentDir = getCurrentDir();
  const symlinkPath = path.join(currentDir, 'theme');

  // Remove existing symlink if it exists
  if (fs.existsSync(symlinkPath)) {
    // Check if it's a symlink
    const stats = fs.lstatSync(symlinkPath);
    if (stats.isSymbolicLink()) {
      fs.unlinkSync(symlinkPath);
      console.log(`Removed existing symlink: ${symlinkPath}`);
    } else if (stats.isDirectory()) {
      // If it's a directory (shouldn't happen), remove it
      fs.rmSync(symlinkPath, { recursive: true, force: true });
      console.log(`Removed existing directory: ${symlinkPath}`);
    }
  }

  // Create new symlink
  try {
    fs.symlinkSync(theme.path, symlinkPath, 'dir');
    console.log(`Created symlink: ${symlinkPath} -> ${theme.path}`);
  } catch (err) {
    console.error('Failed to create symlink:', err);
    throw new Error(`Failed to create symlink: ${err}`);
  }

  // Update state
  const statePath = getStatePath();
  const state: State = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  state.currentTheme = name;
  state.lastSwitched = Date.now();
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

  // Update recent themes in preferences
  const prefsPath = getPreferencesPath();
  const prefs: Preferences = JSON.parse(fs.readFileSync(prefsPath, 'utf-8'));

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

  fs.writeFileSync(prefsPath, JSON.stringify(prefs, null, 2));
  console.log(`Updated recent themes: ${prefs.recentThemes.slice(0, 5).join(', ')}`);

  console.log(`Theme ${name} applied successfully`);

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
    const { refreshTrayMenu } = await import('./main');
    refreshTrayMenu();
  } catch (err) {
    console.error('Failed to refresh tray menu:', err);
  }

  // Update VS Code settings if enabled
  try {
    if (prefs.enabledApps && prefs.enabledApps.includes('vscode')) {
      await updateVSCodeSettings(name, theme.path);
    } else {
      console.log('VS Code integration disabled in preferences');
    }
  } catch (err) {
    console.error('Failed to update VS Code settings:', err);
  }

  // Notify terminal applications to reload themes
  try {
    await notifyTerminalsToReload(theme.path);
  } catch (err) {
    console.error('Failed to notify terminals:', err);
  }

  // Execute user-defined hook script if configured
  try {
    if (prefs.hookScript && prefs.hookScript.trim() !== '') {
      await executeHookScript(name, prefs.hookScript);
    } else {
      console.log('No hook script configured');
    }
  } catch (err) {
    console.error('Failed to execute hook script:', err);
    // Don't throw - hook script failure shouldn't block theme application
  }
}

/**
 * Create a new custom theme
 */
async function handleCreateTheme(_event: any, data: ThemeMetadata): Promise<void> {
  console.log(`Creating theme: ${data.name}`);

  const customThemesDir = getCustomThemesDir();

  // Create a safe directory name from the theme name
  const themeDirName = data.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const themeDir = path.join(customThemesDir, themeDirName);

  // Check if theme already exists
  if (fs.existsSync(themeDir)) {
    throw new Error(`Theme "${data.name}" already exists`);
  }

  // Import the helper function from themeInstaller
  const { generateThemeConfigFiles } = await import('./themeInstaller');

  // Generate all config files
  generateThemeConfigFiles(themeDir, data);

  console.log(`Theme "${data.name}" created successfully at ${themeDir}`);

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
  console.log(`Updating theme: ${name}`);

  try {
    // Only allow updating custom themes
    const customThemesDir = getCustomThemesDir();

    // Create safe directory name from the theme name
    const themeDirName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const themeDir = path.join(customThemesDir, themeDirName);

    // Check if theme exists in custom themes directory
    if (!fs.existsSync(themeDir)) {
      throw new Error('Theme not found in custom themes directory. Only custom themes can be updated.');
    }

    // Read existing theme metadata to preserve any fields not in the update
    const existingMetadataPath = path.join(themeDir, 'theme.json');
    let existingMetadata: ThemeMetadata;
    if (fs.existsSync(existingMetadataPath)) {
      existingMetadata = JSON.parse(fs.readFileSync(existingMetadataPath, 'utf-8'));
    } else {
      throw new Error('Theme metadata (theme.json) not found');
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
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Regenerate all config files with the updated metadata
    generateThemeConfigFiles(themeDir, updatedMetadata);

    console.log(`Theme "${name}" updated successfully at ${themeDir}`);

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
      console.log('Updated theme is currently active, notifying terminals to reload...');
      try {
        await notifyTerminalsToReload(themeDir);
      } catch (err) {
        console.error('Failed to notify terminals:', err);
      }
    }
  } catch (error) {
    console.error('Error updating theme:', error);
    throw error;
  }
}

/**
 * Delete a custom theme
 */
async function handleDeleteTheme(_event: any, name: string): Promise<void> {
  console.log(`Deleting theme: ${name}`);

  try {
    // Only allow deletion of custom themes
    const customThemesDir = getCustomThemesDir();
    const themeDir = path.join(customThemesDir, name);

    // Check if theme exists in custom themes directory
    if (!fs.existsSync(themeDir)) {
      throw new Error('Theme not found in custom themes directory');
    }

    // Check if this is the currently active theme
    const state = await handleGetState();
    if (state.currentTheme === name) {
      throw new Error('Cannot delete the currently active theme. Please switch to a different theme first.');
    }

    // Delete the theme directory recursively
    fs.rmSync(themeDir, { recursive: true, force: true });
    console.log(`Successfully deleted theme: ${name}`);

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
    console.error('Error deleting theme:', error);
    throw error;
  }
}

/**
 * Duplicate a theme (creates a copy in custom-themes)
 */
async function handleDuplicateTheme(_event: any, sourceThemeName: string): Promise<void> {
  console.log(`Duplicating theme: ${sourceThemeName}`);

  try {
    // Find the source theme
    const themesDir = getThemesDir();
    const customThemesDir = getCustomThemesDir();

    let sourceThemeDir: string;
    if (fs.existsSync(path.join(themesDir, sourceThemeName))) {
      sourceThemeDir = path.join(themesDir, sourceThemeName);
    } else if (fs.existsSync(path.join(customThemesDir, sourceThemeName))) {
      sourceThemeDir = path.join(customThemesDir, sourceThemeName);
    } else {
      throw new Error('Source theme not found');
    }

    // Read source theme metadata
    const sourceMetadataPath = path.join(sourceThemeDir, 'theme.json');
    const sourceMetadata = JSON.parse(fs.readFileSync(sourceMetadataPath, 'utf-8'));

    // Generate new theme name
    let copyNumber = 1;
    let newThemeName = `${sourceMetadata.name} (Copy)`;
    let newThemeDir = path.join(customThemesDir, `${sourceThemeName}-copy`);

    while (fs.existsSync(newThemeDir)) {
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

    console.log(`Successfully duplicated theme to: ${newThemeName}`);

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
    console.error('Error duplicating theme:', error);
    throw error;
  }
}

/**
 * Export a theme to a file
 * If exportPath is null/undefined, shows a save dialog
 * Returns the path where the theme was exported
 */
async function handleExportTheme(_event: any, name: string, exportPath?: string): Promise<string> {
  console.log(`Exporting theme ${name}`);

  try {
    const themesDir = getThemesDir();
    const customThemesDir = getCustomThemesDir();

    // Find the theme directory
    let themePath = path.join(themesDir, name);
    if (!fs.existsSync(themePath)) {
      themePath = path.join(customThemesDir, name);
      if (!fs.existsSync(themePath)) {
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
        throw new Error('Export canceled');
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
        console.log(`Theme exported: ${archive.pointer()} bytes written to ${exportPath}`);
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

    console.log(`Successfully exported theme "${name}" to ${exportPath}`);
    return exportPath;
  } catch (error) {
    console.error('Failed to export theme:', error);
    throw error;
  }
}

/**
 * Import a theme from a file
 * If importPath is null/undefined, shows an open dialog
 */
async function handleImportTheme(_event: any, importPath?: string): Promise<void> {
  console.log(`Importing theme${importPath ? ` from ${importPath}` : ''}`);

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
        throw new Error('Import canceled');
      }

      importPath = result.filePaths[0];
    }

    // Validate file exists
    if (!fs.existsSync(importPath)) {
      throw new Error(`File not found: ${importPath}`);
    }

    // Create temporary directory for extraction
    const tmpDir = path.join(os.tmpdir(), `mactheme-import-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    try {
      // Extract the zip archive
      console.log(`Extracting archive to: ${tmpDir}`);
      await execAsync(`unzip -q "${importPath}" -d "${tmpDir}"`);

      // Find the theme directory (should be the only directory in tmpDir)
      const extractedContents = fs.readdirSync(tmpDir);

      if (extractedContents.length === 0) {
        throw new Error('Archive is empty');
      }

      // Get the theme directory (first directory in the extracted contents)
      const themeDir = extractedContents.find(name => {
        const itemPath = path.join(tmpDir, name);
        return fs.statSync(itemPath).isDirectory();
      });

      if (!themeDir) {
        throw new Error('No theme directory found in archive');
      }

      const extractedThemePath = path.join(tmpDir, themeDir);

      // Validate theme structure - must have theme.json
      const themeMetadataPath = path.join(extractedThemePath, 'theme.json');
      if (!fs.existsSync(themeMetadataPath)) {
        throw new Error('Invalid theme: missing theme.json');
      }

      // Read and parse theme metadata
      const themeMetadata = JSON.parse(fs.readFileSync(themeMetadataPath, 'utf-8'));
      const themeName = themeMetadata.name || themeDir;

      // Determine destination directory
      const customThemesDir = getCustomThemesDir();
      let destThemeDir = path.join(customThemesDir, themeDir);

      // Check if theme already exists
      if (fs.existsSync(destThemeDir)) {
        // Generate unique name by appending number
        let counter = 1;
        while (fs.existsSync(path.join(customThemesDir, `${themeDir}-${counter}`))) {
          counter++;
        }
        destThemeDir = path.join(customThemesDir, `${themeDir}-${counter}`);
        console.log(`Theme already exists, importing as: ${path.basename(destThemeDir)}`);
      }

      // Copy theme to custom-themes directory
      fs.cpSync(extractedThemePath, destThemeDir, { recursive: true });
      console.log(`Theme imported to: ${destThemeDir}`);

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

      console.log(`Successfully imported theme: ${themeName}`);
    } catch (extractError) {
      // Clean up temp directory on error
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
      throw extractError;
    }
  } catch (error) {
    console.error('Failed to import theme:', error);
    throw error;
  }
}

/**
 * List wallpapers for a theme
 */
async function handleListWallpapers(_event: any, themeName: string): Promise<string[]> {
  console.log(`Listing wallpapers for theme: ${themeName}`);

  try {
    const themesDir = getThemesDir();
    const customThemesDir = getCustomThemesDir();

    // Try bundled themes first
    let themePath = path.join(themesDir, themeName);
    if (!fs.existsSync(themePath)) {
      // Try custom themes
      themePath = path.join(customThemesDir, themeName);
    }

    const wallpapersDir = path.join(themePath, 'wallpapers');

    if (!fs.existsSync(wallpapersDir)) {
      console.log(`No wallpapers directory found for theme: ${themeName}`);
      return [];
    }

    const files = fs.readdirSync(wallpapersDir);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.png', '.jpg', '.jpeg', '.heic', '.webp'].includes(ext);
    });

    // Return full paths to the wallpaper files
    const wallpaperPaths = imageFiles.map(file => path.join(wallpapersDir, file));

    console.log(`Found ${wallpaperPaths.length} wallpapers for theme: ${themeName}`);
    return wallpaperPaths;
  } catch (error) {
    console.error(`Error listing wallpapers for theme ${themeName}:`, error);
    return [];
  }
}

/**
 * Apply a wallpaper
 */
async function handleApplyWallpaper(_event: any, wallpaperPath: string, displayIndex?: number): Promise<void> {
  console.log(`Applying wallpaper: ${wallpaperPath}`, displayIndex !== undefined ? `to display ${displayIndex}` : 'to all displays');

  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    // Check if wallpaper file exists
    if (!fs.existsSync(wallpaperPath)) {
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
    if (fs.existsSync(wallpaperSymlink)) {
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

    console.log(`Wallpaper applied successfully: ${wallpaperPath}`);
  } catch (error) {
    console.error(`Error applying wallpaper:`, error);
    throw error;
  }
}

/**
 * Get list of connected displays
 */
async function handleGetDisplays(): Promise<any[]> {
  console.log('Getting connected displays');

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

    console.log(`Found ${displays.length} display(s):`, displays);
    return displays;
  } catch (error) {
    console.error('Error getting displays:', error);
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
 * Detect installed applications
 */
async function handleDetectApps(): Promise<any[]> {
  console.log('Detecting installed applications');

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
  ];

  // Check which apps are installed and configured
  const detectedApps = apps.map(app => {
    // Check if app is installed
    const isInstalled = app.paths.some(p => fs.existsSync(p));

    // Check if config file exists (means it might be configured)
    const isConfigured = fs.existsSync(app.configPath);

    return {
      name: app.name,
      displayName: app.displayName,
      category: app.category,
      isInstalled,
      isConfigured: isInstalled && isConfigured,
      configPath: app.configPath,
    };
  });

  console.log(`Detected ${detectedApps.filter(a => a.isInstalled).length} installed apps`);
  return detectedApps;
}

/**
 * Setup an application for theming
 * Automatically configures the app's config file to import MacTheme themes
 */
async function handleSetupApp(_event: any, appName: string): Promise<void> {
  console.log(`Setting up app: ${appName}`);

  const homeDir = os.homedir();
  const themeBasePath = '~/Library/Application Support/MacTheme/current/theme';

  try {
    // Define config paths and import statements for each app
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
      vscode: {
        configPath: path.join(homeDir, 'Library', 'Application Support', 'Code', 'User', 'settings.json'),
        importLine: `"workbench.colorCustomizations": require("${themeBasePath}/vscode.json")`,
      },
      starship: {
        configPath: path.join(homeDir, '.config', 'starship.toml'),
        importLine: `"$include" = '${themeBasePath}/starship.toml'`,
      },
    };

    const config = appConfigs[appName];
    if (!config) {
      throw new Error(`Unsupported app: ${appName}`);
    }

    const { configPath, importLine } = config;
    const configDir = path.dirname(configPath);

    // Create config directory if it doesn't exist
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Read existing config or create new one
    let configContent = '';
    if (fs.existsSync(configPath)) {
      // Create backup
      const backupPath = `${configPath}.bak`;
      fs.copyFileSync(configPath, backupPath);
      console.log(`Created backup at: ${backupPath}`);

      configContent = fs.readFileSync(configPath, 'utf-8');

      // Check if import already exists
      if (configContent.includes(importLine) || configContent.includes('MacTheme/current/theme')) {
        throw new Error('MacTheme import already exists in config file');
      }
    }

    // Add import statement at the top of the file
    const newContent = importLine + '\n\n' + configContent;
    fs.writeFileSync(configPath, newContent, 'utf-8');

    console.log(`Successfully configured ${appName} at ${configPath}`);

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
    console.error(`Failed to setup ${appName}:`, error);
    throw new Error(`Failed to setup ${appName}: ${error.message}`);
  }
}

/**
 * Refresh an application's theme
 * Sends reload signal to supported applications
 */
async function handleRefreshApp(_event: any, appName: string): Promise<void> {
  console.log(`Refreshing app: ${appName}`);

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
          console.log('Kitty theme refreshed successfully');
        } catch (error: any) {
          // If socket doesn't exist or kitty isn't running, that's ok
          if (error.message.includes('No such file') || error.message.includes('Connection refused')) {
            console.log('Kitty is not running or remote control is not enabled');
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
          console.log('iTerm2 theme refreshed successfully');
        } catch (error: any) {
          if (error.message.includes('not running')) {
            console.log('iTerm2 is not running');
          } else {
            throw error;
          }
        }
        break;

      case 'alacritty':
        // Alacritty watches config file, so just touching it triggers reload
        const alacrittyConfig = path.join(os.homedir(), '.config', 'alacritty', 'alacritty.toml');
        if (fs.existsSync(alacrittyConfig)) {
          const now = new Date();
          fs.utimesSync(alacrittyConfig, now, now);
          console.log('Alacritty config touched - will auto-reload');
        } else {
          console.log('Alacritty config not found');
        }
        break;

      case 'vscode':
        console.log('VS Code requires manual reload (Cmd+R) to apply theme changes');
        break;

      case 'neovim':
        console.log('Neovim requires manual reload (:source $MYVIMRC) to apply theme changes');
        break;

      default:
        console.log(`App refresh not supported for ${appName}`);
    }
  } catch (error: any) {
    console.error(`Failed to refresh ${appName}:`, error);
    throw new Error(`Failed to refresh ${appName}: ${error.message}`);
  }
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

  // Read old preferences to detect changes
  const oldPrefs = JSON.parse(fs.readFileSync(prefsPath, 'utf-8')) as Preferences;

  // Write new preferences
  fs.writeFileSync(prefsPath, JSON.stringify(prefs, null, 2));
  console.log('Preferences updated');

  // Check if showInMenuBar preference changed
  if (oldPrefs.showInMenuBar !== prefs.showInMenuBar) {
    try {
      const { updateTrayVisibility } = await import('./main');
      updateTrayVisibility(prefs.showInMenuBar);
      console.log(`Menu bar icon ${prefs.showInMenuBar ? 'shown' : 'hidden'}`);
    } catch (err) {
      console.error('Failed to update tray visibility:', err);
    }
  }

  // Check if keyboard shortcut changed
  if (oldPrefs.keyboardShortcuts.quickSwitcher !== prefs.keyboardShortcuts.quickSwitcher) {
    try {
      const { updateQuickSwitcherShortcut } = await import('./main');
      updateQuickSwitcherShortcut(prefs.keyboardShortcuts.quickSwitcher);
      console.log(`Keyboard shortcut updated to: ${prefs.keyboardShortcuts.quickSwitcher}`);
    } catch (err) {
      console.error('Failed to update keyboard shortcut:', err);
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
    console.log('Preferences backed up to:', filePath);

    return filePath;
  } catch (err) {
    console.error('Failed to backup preferences:', err);
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
    console.log(`Created safety backup at: ${currentBackupPath}`);

    // Write restored preferences
    fs.writeFileSync(prefsPath, JSON.stringify(backup.preferences, null, 2));
    console.log('Preferences restored from:', backupPath);

    // Update tray visibility if showInMenuBar changed
    try {
      const { updateTrayVisibility } = await import('./main');
      updateTrayVisibility(backup.preferences.showInMenuBar || false);
    } catch (err) {
      console.error('Failed to update tray visibility after restore:', err);
    }

    return true;
  } catch (err) {
    console.error('Failed to restore preferences:', err);
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
 * Apply theme automatically based on system appearance
 * Called when system appearance changes
 */
export async function handleAppearanceChange(): Promise<void> {
  try {
    // Get preferences to check if auto-switching is enabled
    const prefs = await handleGetPreferences();

    // Check if auto-switching based on system appearance is enabled
    if (!prefs.autoSwitch?.enabled || prefs.autoSwitch?.mode !== 'system') {
      return;
    }

    // Get current system appearance
    const appearance = await handleGetSystemAppearance();
    console.log(`System appearance changed to: ${appearance}`);

    // Get the appropriate theme based on appearance
    const themeToApply = appearance === 'dark'
      ? prefs.defaultDarkTheme
      : prefs.defaultLightTheme;

    if (!themeToApply) {
      console.warn(`No default ${appearance} theme configured`);
      return;
    }

    // Get current state to avoid unnecessary theme switches
    const state = await handleGetState();
    if (state.currentTheme === themeToApply) {
      console.log(`Already using theme: ${themeToApply}`);
      return;
    }

    // Apply the theme
    console.log(`Auto-switching to ${appearance} theme: ${themeToApply}`);
    await handleApplyTheme(null, themeToApply);

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
    console.error('Error handling appearance change:', error);
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
      console.warn('Schedule times not configured');
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
      console.warn(`No default ${shouldUseDarkTheme ? 'dark' : 'light'} theme configured`);
      return;
    }

    // Get current state to avoid unnecessary theme switches
    const state = await handleGetState();
    if (state.currentTheme === themeToApply) {
      // Already using the correct theme
      return;
    }

    // Apply the theme
    console.log(`Schedule-based auto-switching to ${shouldUseDarkTheme ? 'dark' : 'light'} theme: ${themeToApply}`);
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
    console.error('Error checking schedule:', error);
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
    console.warn('Could not determine user location, using San Francisco as default');
    return {
      latitude: 37.7749,
      longitude: -122.4194
    };
  } catch (error) {
    console.error('Error getting user location:', error);
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
    console.error('Error calculating sunrise/sunset:', error);
    return null;
  }
}

/**
 * Get current application state
 */
async function handleGetState(): Promise<State> {
  const statePath = getStatePath();
  const stateContent = fs.readFileSync(statePath, 'utf-8');
  return JSON.parse(stateContent);
}
