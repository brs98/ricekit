import { ipcMain, shell } from 'electron';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { logger } from '../logger';
import { getCurrentPresetsDir } from '../directories';
import {
  readFile,
  writeFile,
  existsSync,
  ensureDir,
  copyFile,
} from '../utils/asyncFs';
import { handleGetPreferences, handleSetPreferences } from './preferencesHandlers';
import {
  listPresets as listPresetsFromInstaller,
  setActivePreset,
  getActivePreset,
} from '../presetInstaller';
import type { PluginConfig, PluginStatus, PresetInfo, FontStatus } from '../../shared/types';
import {
  getFontStatus,
  installNerdFont,
  getAvailableNerdFont,
  RECOMMENDED_NERD_FONT,
} from '../utils/fontDetection';
import { getErrorMessage } from '../../shared/errors';

/** Shape for plugin definition entries */
interface PluginDefinition {
  displayName: string;
  binaryPaths: readonly string[];
  configDir: string;
  mainConfigFile: string;
  installCommand: string;
  brewPackage: string;
  dependencies: readonly string[];
  serviceCommand: string;
}

// Plugin definitions with installation info
const PLUGIN_DEFINITIONS = {
  sketchybar: {
    displayName: 'SketchyBar',
    binaryPaths: ['/opt/homebrew/bin/sketchybar', '/usr/local/bin/sketchybar'],
    configDir: path.join(os.homedir(), '.config', 'sketchybar'),
    mainConfigFile: 'sketchybarrc',
    installCommand: 'brew install FelixKratz/formulae/sketchybar',
    brewPackage: 'FelixKratz/formulae/sketchybar',
    dependencies: [],
    serviceCommand: 'brew services start sketchybar',
  },
  aerospace: {
    displayName: 'AeroSpace',
    binaryPaths: [
      '/opt/homebrew/bin/aerospace',
      '/usr/local/bin/aerospace',
      '/Applications/AeroSpace.app/Contents/MacOS/AeroSpace',
    ],
    configDir: path.join(os.homedir(), '.config', 'aerospace'),
    mainConfigFile: 'aerospace.toml',
    installCommand: 'brew install --cask nikitabobko/tap/aerospace',
    brewPackage: 'nikitabobko/tap/aerospace',
    dependencies: ['FelixKratz/formulae/borders'],
    serviceCommand: '',
  },
  tmux: {
    displayName: 'tmux',
    binaryPaths: ['/opt/homebrew/bin/tmux', '/usr/local/bin/tmux'],
    configDir: os.homedir(),
    mainConfigFile: '.tmux.conf',
    installCommand: 'brew install tmux',
    brewPackage: 'tmux',
    dependencies: [],
    serviceCommand: '',
  },
} as const satisfies Record<string, PluginDefinition>;

type PluginName = keyof typeof PLUGIN_DEFINITIONS;

/**
 * Type guard for plugin names
 */
function isPluginName(name: string): name is PluginName {
  return name in PLUGIN_DEFINITIONS;
}

/**
 * Check if Homebrew is installed
 */
function isHomebrewInstalled(): boolean {
  const brewPaths = ['/opt/homebrew/bin/brew', '/usr/local/bin/brew'];
  return brewPaths.some((p) => existsSync(p));
}

/**
 * Get Homebrew binary path
 */
function getBrewPath(): string {
  const paths = ['/opt/homebrew/bin/brew', '/usr/local/bin/brew'];
  return paths.find((p) => existsSync(p)) || 'brew';
}

/**
 * Get plugin installation status
 */
export async function handleGetPluginStatus(
  _event: unknown,
  appName: string
): Promise<PluginStatus> {
  if (!isPluginName(appName)) {
    throw new Error(`Unknown plugin: ${appName}`);
  }
  const plugin = PLUGIN_DEFINITIONS[appName];

  const binaryPath = plugin.binaryPaths.find((p) => existsSync(p));
  const configExists = existsSync(plugin.configDir);
  const mainConfigExists = existsSync(path.join(plugin.configDir, plugin.mainConfigFile));

  let version: string | undefined;
  if (binaryPath && !binaryPath.endsWith('.app') && !binaryPath.includes('.app/')) {
    try {
      const output = execSync(`"${binaryPath}" --version 2>/dev/null || echo "unknown"`, {
        encoding: 'utf-8',
        timeout: 5000,
      });
      const lines = output.trim().split('\n');
      version = lines[0] ?? undefined;
    } catch {
      version = undefined;
    }
  }

  return {
    isInstalled: !!binaryPath,
    binaryPath,
    version,
    hasExistingConfig: configExists && mainConfigExists,
    configPath: plugin.configDir,
  };
}

/**
 * Install a plugin via Homebrew
 */
export async function handleInstallPlugin(_event: unknown, appName: string): Promise<void> {
  if (!isPluginName(appName)) {
    throw new Error(`Unknown plugin: ${appName}`);
  }
  const plugin = PLUGIN_DEFINITIONS[appName];

  // Check if Homebrew is installed
  if (!isHomebrewInstalled()) {
    // Open Homebrew website and throw error
    await shell.openExternal('https://brew.sh');
    throw new Error(
      'Homebrew is required but not installed. Please install Homebrew first, then try again.'
    );
  }

  const brewPath = getBrewPath();
  logger.info(`Installing ${appName} via Homebrew...`);

  // Install dependencies first
  for (const dep of plugin.dependencies) {
    try {
      logger.info(`Installing dependency: ${dep}`);
      execSync(`"${brewPath}" install ${dep}`, {
        encoding: 'utf-8',
        stdio: 'pipe',
        timeout: 300000, // 5 minutes
      });
      logger.info(`Installed dependency: ${dep}`);
    } catch (err: unknown) {
      // Dependency might already be installed, check if it failed for other reason
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes('already installed')) {
        logger.warn(`Dependency install warning (may already exist): ${dep}`, message);
      }
    }
  }

  // Install the main package
  try {
    const command = plugin.installCommand.replace('brew', `"${brewPath}"`);
    logger.info(`Running: ${command}`);
    execSync(command, {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 300000, // 5 minutes
    });
    logger.info(`Successfully installed ${appName}`);

    // Start service if applicable
    if (plugin.serviceCommand) {
      try {
        const serviceCmd = plugin.serviceCommand.replace('brew', `"${brewPath}"`);
        execSync(serviceCmd, {
          encoding: 'utf-8',
          stdio: 'pipe',
          timeout: 30000,
        });
        logger.info(`Started ${appName} service`);
      } catch (err: unknown) {
        logger.warn(`Could not start ${appName} service:`, getErrorMessage(err));
      }
    }

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Failed to install ${appName}:`, message);
    throw new Error(`Failed to install ${appName}: ${message}`);
  }
}

/**
 * Get overrides file info for a plugin (tool-specific format)
 */
function getOverridesInfo(
  appName: PluginName,
  displayName: string
): { path: string; content: string } | null {
  const homeDir = os.homedir();

  switch (appName) {
    case 'sketchybar':
      return {
        path: path.join(homeDir, '.config', 'sketchybar', 'overrides.sh'),
        content: `#!/bin/bash
# User overrides for ${displayName}
# This file is never modified by Ricekit and survives preset switches.
# Add your customizations here.

`,
      };
    case 'tmux':
      return {
        path: path.join(homeDir, '.tmux-overrides.conf'),
        content: `# User overrides for ${displayName}
# This file is never modified by Ricekit and survives preset switches.
# Add your customizations here.

`,
      };
    case 'aerospace':
      // aerospace uses TOML, overrides would need manual editing
      return null;
  }
  // Exhaustive check: if a new plugin is added without handling overrides, this will error
  const _exhaustive: never = appName;
  throw new Error(`Unhandled plugin in getOverridesInfo: ${_exhaustive}`);
}

/**
 * Set up plugin with a preset (creates wrapper config)
 */
export async function handleSetPreset(
  _event: unknown,
  appName: string,
  presetName: string
): Promise<void> {
  if (!isPluginName(appName)) {
    throw new Error(`Unknown plugin: ${appName}`);
  }
  const plugin = PLUGIN_DEFINITIONS[appName];

  const configDir = plugin.configDir;
  const mainConfigPath = path.join(configDir, plugin.mainConfigFile);

  // Ensure config directory exists
  await ensureDir(configDir);

  // Backup existing config if present and not already backed up
  if (existsSync(mainConfigPath)) {
    const backupPath = `${mainConfigPath}.ricekit-backup`;
    if (!existsSync(backupPath)) {
      await copyFile(mainConfigPath, backupPath);
      logger.info(`Backed up existing config to: ${backupPath}`);
    }
  }

  // Create overrides file if it doesn't exist (tool-specific format)
  const overridesInfo = getOverridesInfo(appName, plugin.displayName);
  if (overridesInfo && !existsSync(overridesInfo.path)) {
    await writeFile(overridesInfo.path, overridesInfo.content);
    logger.info(`Created overrides file: ${overridesInfo.path}`);
  }

  // Update the preset symlink
  await setActivePreset(appName, presetName);

  // Generate the wrapper config file
  await generateWrapperConfig(appName, plugin, configDir);

  // Update preferences
  const prefs = await handleGetPreferences();
  if (!prefs.pluginConfigs) {
    prefs.pluginConfigs = {};
  }

  const existingConfig = prefs.pluginConfigs[appName];
  prefs.pluginConfigs[appName] = {
    mode: 'preset',
    preset: presetName,
    installedBy: existingConfig?.installedBy || 'ricekit',
    configBackupPath: existsSync(`${mainConfigPath}.ricekit-backup`)
      ? `${mainConfigPath}.ricekit-backup`
      : undefined,
    lastUpdated: Date.now(),
  };

  // Also add to enabledApps if not already there
  if (!prefs.enabledApps.includes(appName)) {
    prefs.enabledApps.push(appName);
  }

  await handleSetPreferences(null, prefs);

  logger.info(`Set preset ${presetName} for ${appName}`);
}

/**
 * Generate wrapper config that sources preset, theme colors, and user overrides
 */
async function generateWrapperConfig(
  appName: string,
  plugin: (typeof PLUGIN_DEFINITIONS)[PluginName],
  configDir: string
): Promise<void> {
  const homeDir = os.homedir();
  const currentPresetPath = `${homeDir}/Library/Application Support/Ricekit/current/presets/${appName}`;
  const themePath = `${homeDir}/Library/Application Support/Ricekit/current/theme`;

  if (appName === 'sketchybar') {
    const content = `#!/bin/bash
# Ricekit SketchyBar Configuration
# This file is auto-generated by Ricekit. Customize via overrides.sh instead.

CONFIG_DIR="$HOME/.config/sketchybar"

# Source theme colors (updated when theme changes)
source "${themePath}/sketchybar-colors.sh"

# Source the active preset configuration
source "${currentPresetPath}/sketchybarrc"

# Source user overrides (safe to customize)
if [ -f "$CONFIG_DIR/overrides.sh" ]; then
  source "$CONFIG_DIR/overrides.sh"
fi
`;
    await writeFile(path.join(configDir, 'sketchybarrc'), content);
    logger.info('Generated SketchyBar wrapper config');
  } else if (appName === 'aerospace') {
    // For AeroSpace, we need to read the preset's aerospace.toml and inject the borders script
    const activePreset = await getActivePreset(appName);
    if (activePreset) {
      const presetTomlPath = path.join(
        getCurrentPresetsDir(),
        '..',
        'presets',
        appName,
        activePreset,
        'aerospace.toml'
      );

      if (existsSync(presetTomlPath)) {
        let content = await readFile(presetTomlPath);

        // Check if we need to inject the borders command
        if (!content.includes('Ricekit')) {
          // Add after-startup-command to source borders script
          const bordersCommand = `# Ricekit: Apply themed window borders on startup
after-startup-command = [
  'exec-and-forget source "${themePath}/aerospace-borders.sh"'
]

`;
          content = bordersCommand + content;
        }

        await writeFile(path.join(configDir, 'aerospace.toml'), content);
        logger.info('Generated AeroSpace config with borders integration');
      }
    }
  } else if (appName === 'tmux') {
    // tmux uses source-file directive
    const content = `# Ricekit tmux Configuration
# This file is auto-generated by Ricekit. Customize via .tmux-overrides.conf instead.

# Source theme colors (updated when theme changes)
source-file "${themePath}/tmux-colors.conf"

# Source the active preset configuration
source-file "${currentPresetPath}/tmux.conf"

# Source user overrides (safe to customize)
if-shell "test -f ${homeDir}/.tmux-overrides.conf" "source-file ${homeDir}/.tmux-overrides.conf"
`;
    await writeFile(path.join(configDir, '.tmux.conf'), content);
    logger.info('Generated tmux wrapper config');
  }
}

/**
 * Reset plugin to custom mode
 */
export async function handleResetPluginToCustom(_event: unknown, appName: string): Promise<void> {
  if (!isPluginName(appName)) {
    throw new Error(`Unknown plugin: ${appName}`);
  }
  const _plugin = PLUGIN_DEFINITIONS[appName]; // Validate plugin exists

  // Update preferences
  const prefs = await handleGetPreferences();
  if (prefs.pluginConfigs?.[appName]) {
    prefs.pluginConfigs[appName].mode = 'custom';
    prefs.pluginConfigs[appName].preset = undefined;
    prefs.pluginConfigs[appName].lastUpdated = Date.now();
    await handleSetPreferences(null, prefs);
  }

  logger.info(`Reset ${appName} to custom mode`);
}

/**
 * Check if a backup exists for a plugin
 */
export async function handleHasPluginBackup(_event: unknown, appName: string): Promise<boolean> {
  if (!isPluginName(appName)) {
    return false;
  }
  const plugin = PLUGIN_DEFINITIONS[appName];

  const backupPath = path.join(plugin.configDir, `${plugin.mainConfigFile}.ricekit-backup`);
  return existsSync(backupPath);
}

/**
 * Restore plugin config from backup
 */
export async function handleRestorePluginBackup(
  _event: unknown,
  appName: string
): Promise<{ success: boolean; error?: string }> {
  if (!isPluginName(appName)) {
    return { success: false, error: `Unknown plugin: ${appName}` };
  }
  const plugin = PLUGIN_DEFINITIONS[appName];

  const configPath = path.join(plugin.configDir, plugin.mainConfigFile);
  const backupPath = path.join(plugin.configDir, `${plugin.mainConfigFile}.ricekit-backup`);

  // Check if backup exists
  if (!existsSync(backupPath)) {
    return { success: false, error: 'No backup found to restore' };
  }

  try {
    // Copy backup back to original location
    await copyFile(backupPath, configPath);
    logger.info(`Restored ${appName} config from backup`);

    // Update preferences to custom mode
    const prefs = await handleGetPreferences();
    if (prefs.pluginConfigs?.[appName]) {
      prefs.pluginConfigs[appName].mode = 'custom';
      prefs.pluginConfigs[appName].preset = undefined;
      prefs.pluginConfigs[appName].lastUpdated = Date.now();
      await handleSetPreferences(null, prefs);
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Failed to restore ${appName} backup:`, message);
    return { success: false, error: message };
  }
}

/**
 * Get plugin configuration
 */
export async function handleGetPluginConfig(
  _event: unknown,
  appName: string
): Promise<PluginConfig | null> {
  const prefs = await handleGetPreferences();
  return prefs.pluginConfigs?.[appName] || null;
}

/**
 * List available presets for a plugin
 */
export async function handleListPresets(_event: unknown, appName: string): Promise<PresetInfo[]> {
  return listPresetsFromInstaller(appName);
}

/**
 * Get Nerd Font status
 */
export function handleGetFontStatus(): FontStatus {
  return getFontStatus();
}

/**
 * Install a Nerd Font via Homebrew
 */
export async function handleInstallNerdFont(
  _event: unknown,
  fontName?: string
): Promise<{ success: boolean; error?: string; installedFont?: string }> {
  const result = await installNerdFont(fontName || RECOMMENDED_NERD_FONT);

  if (result.success) {
    // Get the newly installed font name
    const installedFont = getAvailableNerdFont();
    return { success: true, installedFont: installedFont || undefined };
  }

  return result;
}

/**
 * Register plugin IPC handlers
 */
export function registerPluginHandlers(): void {
  ipcMain.handle('plugins:getStatus', handleGetPluginStatus);
  ipcMain.handle('plugins:install', handleInstallPlugin);
  ipcMain.handle('plugins:listPresets', handleListPresets);
  ipcMain.handle('plugins:setPreset', handleSetPreset);
  ipcMain.handle('plugins:getConfig', handleGetPluginConfig);
  ipcMain.handle('plugins:resetToCustom', handleResetPluginToCustom);
  ipcMain.handle('plugins:hasBackup', handleHasPluginBackup);
  ipcMain.handle('plugins:restoreBackup', handleRestorePluginBackup);
  ipcMain.handle('plugins:getFontStatus', handleGetFontStatus);
  ipcMain.handle('plugins:installNerdFont', handleInstallNerdFont);

  logger.info('Plugin handlers registered');
}
