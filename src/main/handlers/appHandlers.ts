/**
 * Application IPC Handlers
 * Handles application detection, setup, and refresh
 */
import { ipcMain, Notification, shell, IpcMainInvokeEvent } from 'electron';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { execSync } from 'child_process';
import type { Theme, AppInfo } from '../../shared/types';
import { getErrorMessage } from '../../shared/errors';
import { logger } from '../logger';
import {
  readFile,
  writeFile,
  existsSync,
  ensureDir,
  copyFile,
} from '../utils/asyncFs';
import { handleGetPreferences, handleSetPreferences } from './preferencesHandlers';
import { handleGetState } from './stateHandlers';

// Forward declarations - will be set to avoid circular deps
let getThemeHandler: ((event: IpcMainInvokeEvent | null, name: string) => Promise<Theme | null>) | null = null;
let updateVSCodeSettingsHandler: ((themeName: string, themePath: string) => Promise<void>) | null = null;
let updateCursorSettingsHandler: ((themeName: string, themePath: string) => Promise<void>) | null = null;

/**
 * Set theme handlers (called by themeHandlers to avoid circular deps)
 */
export function setThemeHandlers(handlers: {
  getTheme: (event: IpcMainInvokeEvent | null, name: string) => Promise<Theme | null>;
  updateVSCodeSettings: (themeName: string, themePath: string) => Promise<void>;
  updateCursorSettings: (themeName: string, themePath: string) => Promise<void>;
}): void {
  getThemeHandler = handlers.getTheme;
  updateVSCodeSettingsHandler = handlers.updateVSCodeSettings;
  updateCursorSettingsHandler = handlers.updateCursorSettings;
}

/**
 * Detect installed applications
 */
export async function handleDetectApps(): Promise<AppInfo[]> {
  logger.info('Detecting installed applications');

  const apps = [
    // Terminals
    {
      name: 'alacritty',
      displayName: 'Alacritty',
      category: 'terminal',
      paths: ['/Applications/Alacritty.app', path.join(process.env.HOME || '', 'Applications', 'Alacritty.app')],
      configPath: path.join(process.env.HOME || '', '.config', 'alacritty', 'alacritty.toml'),
    },
    {
      name: 'kitty',
      displayName: 'Kitty',
      category: 'terminal',
      paths: ['/Applications/kitty.app', path.join(process.env.HOME || '', 'Applications', 'kitty.app')],
      configPath: path.join(process.env.HOME || '', '.config', 'kitty', 'kitty.conf'),
    },
    {
      name: 'iterm2',
      displayName: 'iTerm2',
      category: 'terminal',
      paths: ['/Applications/iTerm.app', path.join(process.env.HOME || '', 'Applications', 'iTerm.app')],
      configPath: path.join(process.env.HOME || '', 'Library', 'Preferences', 'com.googlecode.iterm2.plist'),
    },
    {
      name: 'warp',
      displayName: 'Warp',
      category: 'terminal',
      paths: ['/Applications/Warp.app', path.join(process.env.HOME || '', 'Applications', 'Warp.app')],
      configPath: path.join(process.env.HOME || '', '.warp', 'themes'),
    },
    {
      name: 'hyper',
      displayName: 'Hyper',
      category: 'terminal',
      paths: ['/Applications/Hyper.app', path.join(process.env.HOME || '', 'Applications', 'Hyper.app')],
      configPath: path.join(process.env.HOME || '', '.hyper.js'),
    },
    {
      name: 'wezterm',
      displayName: 'WezTerm',
      category: 'terminal',
      paths: ['/Applications/WezTerm.app', path.join(process.env.HOME || '', 'Applications', 'WezTerm.app')],
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
      paths: ['/Applications/Cursor.app', path.join(process.env.HOME || '', 'Applications', 'Cursor.app')],
      configPath: path.join(
        process.env.HOME || '',
        'Library',
        'Application Support',
        'Cursor',
        'User',
        'settings.json'
      ),
    },
    {
      name: 'neovim',
      displayName: 'Neovim',
      category: 'editor',
      paths: ['/usr/local/bin/nvim', '/opt/homebrew/bin/nvim'],
      configPath: path.join(process.env.HOME || '', '.config', 'nvim'),
    },
    {
      name: 'sublime',
      displayName: 'Sublime Text',
      category: 'editor',
      paths: ['/Applications/Sublime Text.app', path.join(process.env.HOME || '', 'Applications', 'Sublime Text.app')],
      configPath: path.join(
        process.env.HOME || '',
        'Library',
        'Application Support',
        'Sublime Text',
        'Packages',
        'User'
      ),
    },

    // CLI Tools
    {
      name: 'bat',
      displayName: 'bat',
      category: 'cli',
      paths: ['/usr/local/bin/bat', '/opt/homebrew/bin/bat'],
      configPath: path.join(process.env.HOME || '', '.config', 'bat', 'config'),
    },
    {
      name: 'delta',
      displayName: 'delta',
      category: 'cli',
      paths: ['/usr/local/bin/delta', '/opt/homebrew/bin/delta'],
      configPath: path.join(process.env.HOME || '', '.gitconfig'),
    },
    {
      name: 'starship',
      displayName: 'Starship',
      category: 'cli',
      paths: ['/usr/local/bin/starship', '/opt/homebrew/bin/starship'],
      configPath: path.join(process.env.HOME || '', '.config', 'starship.toml'),
    },
    {
      name: 'fzf',
      displayName: 'fzf',
      category: 'cli',
      paths: ['/usr/local/bin/fzf', '/opt/homebrew/bin/fzf'],
      configPath: path.join(process.env.HOME || '', '.fzf.bash'),
    },
    {
      name: 'lazygit',
      displayName: 'lazygit',
      category: 'cli',
      paths: ['/usr/local/bin/lazygit', '/opt/homebrew/bin/lazygit'],
      configPath: path.join(process.env.HOME || '', '.config', 'lazygit', 'config.yml'),
    },
    {
      name: 'sketchybar',
      displayName: 'SketchyBar',
      category: 'system',
      paths: ['/usr/local/bin/sketchybar', '/opt/homebrew/bin/sketchybar'],
      configPath: path.join(process.env.HOME || '', '.config', 'sketchybar', 'sketchybarrc'),
    },

    // Launchers
    {
      name: 'raycast',
      displayName: 'Raycast',
      category: 'launcher',
      paths: ['/Applications/Raycast.app', path.join(process.env.HOME || '', 'Applications', 'Raycast.app')],
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
      paths: ['/Applications/Slack.app', path.join(process.env.HOME || '', 'Applications', 'Slack.app')],
      configPath: path.join(
        process.env.HOME || '',
        'Library',
        'Application Support',
        'Flowstate',
        'current',
        'theme',
        'slack-theme.txt'
      ),
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
  const detectedApps = apps.map((app) => {
    // Check if app is installed
    const isInstalled = app.paths.some((p) => existsSync(p));

    // Check if config file exists (means it might be configured)
    const isConfigured = existsSync(app.configPath);

    return {
      name: app.name,
      displayName: app.displayName,
      category: app.category as AppInfo['category'],
      isInstalled,
      isConfigured: isInstalled && isConfigured,
      configPath: app.configPath,
    };
  });

  logger.info(`Detected ${detectedApps.filter((a) => a.isInstalled).length} installed apps`);
  return detectedApps;
}

/**
 * Setup Cursor or VS Code for theming
 * These editors don't support file imports, so we directly configure them
 * and add them to enabledApps for automatic theme switching
 */
async function setupEditorApp(appName: string, displayName: string, settingsPath: string): Promise<void> {
  logger.info(`Setting up ${displayName}...`);

  const settingsDir = path.dirname(settingsPath);

  // Create settings directory if it doesn't exist
  if (!existsSync(settingsDir)) {
    await ensureDir(settingsDir);
  }

  // Create backup if settings file exists
  if (existsSync(settingsPath)) {
    const backupPath = `${settingsPath}.flowstate-backup`;
    await copyFile(settingsPath, backupPath);
    logger.info(`Created backup at: ${backupPath}`);
  }

  // Get current theme to apply
  const state = await handleGetState();
  const currentThemeName = state.currentTheme;

  if (currentThemeName && getThemeHandler) {
    // Apply current theme to the editor
    const theme = await getThemeHandler(null, currentThemeName);
    if (theme) {
      if (appName === 'cursor' && updateCursorSettingsHandler) {
        await updateCursorSettingsHandler(currentThemeName, theme.path);
      } else if (appName === 'vscode' && updateVSCodeSettingsHandler) {
        await updateVSCodeSettingsHandler(currentThemeName, theme.path);
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
 * Automatically configures the app's config file to import Flowstate themes
 */
export async function handleSetupApp(_event: IpcMainInvokeEvent | null, appName: string): Promise<void> {
  logger.info(`Setting up app: ${appName}`);

  const homeDir = os.homedir();
  const themeBasePath = '~/Library/Application Support/Flowstate/current/theme';

  try {
    // Handle Cursor and VS Code specially - they don't support file imports
    if (appName === 'cursor') {
      const cursorSettingsPath = path.join(
        homeDir,
        'Library',
        'Application Support',
        'Cursor',
        'User',
        'settings.json'
      );
      await setupEditorApp('cursor', 'Cursor', cursorSettingsPath);

      // Show notification
      if (Notification.isSupported()) {
        const notification = new Notification({
          title: 'Setup Complete',
          body: 'Cursor has been configured to use Flowstate themes. Themes will be applied automatically when you switch themes.',
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
          body: 'VS Code has been configured to use Flowstate themes. Themes will be applied automatically when you switch themes.',
          silent: false,
        });
        notification.show();
      }
      return;
    }

    // Handle Slack specially - it requires manual theme application
    if (appName === 'slack') {
      const slackThemePath = path.join(
        homeDir,
        'Library',
        'Application Support',
        'Flowstate',
        'current',
        'theme',
        'slack-theme.txt'
      );

      // Check if theme file exists
      if (existsSync(slackThemePath)) {
        // Open the theme file in the default text editor
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
    type AppConfigKey = 'alacritty' | 'kitty' | 'neovim' | 'starship' | 'wezterm' | 'sketchybar' | 'aerospace';
    const appConfigs: Record<AppConfigKey, { configPath: string; importLine: string; section?: string }> = {
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
        importLine: `-- Flowstate WezTerm integration
local flowstate_colors = wezterm.home_dir .. "/Library/Application Support/Flowstate/wezterm-colors.lua"
wezterm.add_to_config_reload_watch_list(flowstate_colors)
config.colors = dofile(flowstate_colors)`,
      },
      sketchybar: {
        configPath: path.join(homeDir, '.config', 'sketchybar', 'sketchybarrc'),
        importLine: `# Flowstate SketchyBar integration
source "$HOME/Library/Application Support/Flowstate/current/theme/sketchybar-colors.sh"`,
      },
      aerospace: {
        configPath: path.join(homeDir, '.config', 'aerospace', 'aerospace.toml'),
        importLine: `# Flowstate AeroSpace/JankyBorders integration
# Note: JankyBorders must be installed for border colors to work
# Install with: brew install FelixKratz/formulae/borders
after-startup-command = [
  'exec-and-forget source "$HOME/Library/Application Support/Flowstate/current/theme/aerospace-borders.sh"'
]`,
      },
    };

    const config = appConfigs[appName as AppConfigKey];
    if (!config) {
      throw new Error(`Unsupported app: ${appName}`);
    }

    const { configPath, importLine } = config;
    const configDir = path.dirname(configPath);

    // Create config directory if it doesn't exist
    if (!existsSync(configDir)) {
      await ensureDir(configDir);
    }

    // Read existing config or create new one
    let configContent = '';
    if (existsSync(configPath)) {
      // Create backup
      const backupPath = `${configPath}.bak`;
      await copyFile(configPath, backupPath);
      logger.info(`Created backup at: ${backupPath}`);

      configContent = await readFile(configPath);

      // Check if import already exists
      if (configContent.includes(importLine) || configContent.includes('Flowstate/current/theme')) {
        throw new Error('Flowstate import already exists in config file');
      }
    }

    // Add import statement at the top of the file
    const newContent = importLine + '\n\n' + configContent;
    await writeFile(configPath, newContent);

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
        body: `${appName} has been configured to use Flowstate themes`,
        silent: false,
      });
      notification.show();
    }
  } catch (error: unknown) {
    logger.error(`Failed to setup ${appName}:`, error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to setup ${appName}: ${message}`);
  }
}

/**
 * Refresh an application's theme
 * Sends reload signal to supported applications
 */
export async function handleRefreshApp(_event: IpcMainInvokeEvent | null, appName: string): Promise<void> {
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
        } catch (error: unknown) {
          // If socket doesn't exist or kitty isn't running, that's ok
          const message = error instanceof Error ? error.message : String(error);
          if (message.includes('No such file') || message.includes('Connection refused')) {
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
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          if (message.includes('not running')) {
            logger.info('iTerm2 is not running');
          } else {
            throw error;
          }
        }
        break;

      case 'alacritty': {
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
      }

      case 'vscode':
        // Re-apply the current theme settings to VS Code
        try {
          const state = await handleGetState();
          if (state.currentTheme && getThemeHandler && updateVSCodeSettingsHandler) {
            const theme = await getThemeHandler(null, state.currentTheme);
            if (theme) {
              await updateVSCodeSettingsHandler(state.currentTheme, theme.path);
              logger.info('VS Code theme settings refreshed');
            }
          }
        } catch (err) {
          logger.info('Could not refresh VS Code:', getErrorMessage(err));
        }
        break;

      case 'cursor':
        // Re-apply the current theme settings to Cursor
        try {
          const state = await handleGetState();
          if (state.currentTheme && getThemeHandler && updateCursorSettingsHandler) {
            const theme = await getThemeHandler(null, state.currentTheme);
            if (theme) {
              await updateCursorSettingsHandler(state.currentTheme, theme.path);
              logger.info('Cursor theme settings refreshed');
            }
          }
        } catch (err) {
          logger.info('Could not refresh Cursor:', getErrorMessage(err));
        }
        break;

      case 'neovim':
        logger.info('Neovim requires manual reload (:source $MYVIMRC) to apply theme changes');
        break;

      case 'wezterm':
        // WezTerm watches the wezterm-colors.lua file we manage
        // Re-copy the current theme to trigger a reload
        try {
          const currentThemePath = path.join(
            os.homedir(),
            'Library',
            'Application Support',
            'Flowstate',
            'current',
            'theme'
          );
          const weztermThemeSrc = path.join(currentThemePath, 'wezterm.lua');
          const weztermThemeDest = path.join(os.homedir(), 'Library', 'Application Support', 'Flowstate', 'wezterm-colors.lua');

          if (existsSync(weztermThemeSrc)) {
            await copyFile(weztermThemeSrc, weztermThemeDest);
            logger.info('WezTerm theme file updated - will auto-reload');
          } else {
            logger.info('WezTerm theme source not found');
          }
        } catch (err) {
          logger.info('Could not refresh WezTerm:', getErrorMessage(err));
        }
        break;

      case 'sketchybar': {
        // SketchyBar can be reloaded via command line
        // Use absolute path - in production, PATH doesn't include Homebrew
        const sketchybarPaths = ['/opt/homebrew/bin/sketchybar', '/usr/local/bin/sketchybar'];
        const sketchybarBin = sketchybarPaths.find((p) => existsSync(p));
        if (sketchybarBin) {
          try {
            execSync(`"${sketchybarBin}" --reload`, {
              stdio: 'pipe',
              timeout: 5000,
            });
            logger.info('SketchyBar theme refreshed successfully');
          } catch (err) {
            logger.info('Could not refresh SketchyBar - it may not be running:', getErrorMessage(err));
          }
        } else {
          logger.info('SketchyBar binary not found');
        }
        break;
      }

      case 'slack':
        // Slack doesn't support automatic theme refresh
        // Users need to manually paste the theme string from the theme file
        logger.info(
          'Slack requires manual theme application. Open Preferences → Themes → Create custom theme and paste the theme string from the slack-theme.txt file.'
        );
        break;

      case 'aerospace':
        // AeroSpace uses JankyBorders for window borders
        // Re-run the borders command with updated colors from the theme
        try {
          const currentThemePath = path.join(
            os.homedir(),
            'Library',
            'Application Support',
            'Flowstate',
            'current',
            'theme'
          );
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
          logger.info('Could not refresh AeroSpace/JankyBorders - borders may not be installed:', getErrorMessage(err));
        }
        break;

      default:
        logger.info(`App refresh not supported for ${appName}`);
    }
  } catch (error: unknown) {
    logger.error(`Failed to refresh ${appName}:`, error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to refresh ${appName}: ${message}`);
  }
}

/**
 * Register app IPC handlers
 */
export function registerAppHandlers(): void {
  ipcMain.handle('apps:detect', handleDetectApps);
  ipcMain.handle('apps:setup', handleSetupApp);
  ipcMain.handle('apps:refresh', handleRefreshApp);
}
