/**
 * Plugin operations
 *
 * Plugin detection, installation, and management.
 */

import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import type { Result } from '../interfaces';
import { ok, err } from '../interfaces';
import { existsSync } from '../utils/fs';
import type { PluginStatus as BasePluginStatus } from '../../shared/types';
import { typedKeys } from '../../shared/types';
import { AEROSPACE_CONFIG_PATHS } from '../apps/adapters/aerospace';

const homeDir = os.homedir();

/**
 * Plugin definitions
 */
const PLUGIN_DEFINITIONS = {
  sketchybar: {
    displayName: 'SketchyBar',
    binaryPaths: ['/opt/homebrew/bin/sketchybar', '/usr/local/bin/sketchybar'],
    configPath: path.join(homeDir, '.config', 'sketchybar', 'sketchybarrc'),
    brewPackage: 'FelixKratz/formulae/sketchybar',
    description: 'Highly customizable macOS status bar replacement',
  },
  aerospace: {
    displayName: 'AeroSpace',
    binaryPaths: [
      '/opt/homebrew/bin/aerospace',
      '/usr/local/bin/aerospace',
      '/Applications/AeroSpace.app/Contents/MacOS/AeroSpace',
    ],
    configPath: path.join(homeDir, '.config', 'aerospace', 'aerospace.toml'),
    brewPackage: 'nikitabobko/tap/aerospace',
    dependencies: ['FelixKratz/formulae/borders'],
    description: 'AeroSpace is an i3-like tiling window manager for macOS',
  },
  tmux: {
    displayName: 'tmux',
    binaryPaths: ['/opt/homebrew/bin/tmux', '/usr/local/bin/tmux'],
    configPath: path.join(homeDir, '.tmux.conf'),
    brewPackage: 'tmux',
    description: 'Terminal multiplexer',
  },
} as const;

type PluginName = keyof typeof PLUGIN_DEFINITIONS;

/**
 * Type guard for plugin names
 * Use this to validate user input before accessing PLUGIN_DEFINITIONS
 */
export function isPluginName(name: string): name is PluginName {
  return name in PLUGIN_DEFINITIONS;
}

/**
 * Extended plugin status for CLI use (includes metadata from PLUGIN_DEFINITIONS)
 * Extends the base PluginStatus from shared types
 */
export interface PluginStatus extends BasePluginStatus {
  name: string;
  displayName: string;
  description: string;
  hasConfig: boolean; // CLI uses hasConfig instead of hasExistingConfig
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
 * Get status of a single plugin
 */
export function getPluginStatus(name: string): PluginStatus | null {
  const plugin = PLUGIN_DEFINITIONS[name as PluginName];
  if (!plugin) return null;

  const binaryPath = plugin.binaryPaths.find((p) => existsSync(p));
  const configPath = name === 'aerospace'
    ? (AEROSPACE_CONFIG_PATHS.find((p) => existsSync(p)) ?? plugin.configPath)
    : plugin.configPath;
  const hasConfig = existsSync(configPath);

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
    name,
    displayName: plugin.displayName,
    description: plugin.description,
    isInstalled: !!binaryPath,
    hasConfig,
    hasExistingConfig: hasConfig, // Alias for base interface compatibility
    configPath,
    version,
    binaryPath,
  };
}

/**
 * List all plugins with their status
 */
export function listPlugins(): PluginStatus[] {
  return typedKeys(PLUGIN_DEFINITIONS)
    .map((name) => getPluginStatus(name))
    .filter((status): status is PluginStatus => status !== null);
}

/**
 * Install a plugin via Homebrew
 */
export async function installPlugin(
  name: string,
  onLog?: (msg: string) => void
): Promise<Result<void, Error>> {
  const plugin = PLUGIN_DEFINITIONS[name as PluginName];
  if (!plugin) {
    return err(new Error(`Unknown plugin: ${name}. Available: ${typedKeys(PLUGIN_DEFINITIONS).join(', ')}`));
  }

  // Check if already installed
  const status = getPluginStatus(name);
  if (status?.isInstalled) {
    return err(new Error(`${plugin.displayName} is already installed`));
  }

  // Check if Homebrew is installed
  if (!isHomebrewInstalled()) {
    return err(new Error(
      'Homebrew is required but not installed. Install from https://brew.sh'
    ));
  }

  const brewPath = getBrewPath();
  onLog?.(`Installing ${plugin.displayName} via Homebrew...`);

  // Install dependencies first
  const deps = (plugin as { dependencies?: string[] }).dependencies || [];
  for (const dep of deps) {
    try {
      onLog?.(`Installing dependency: ${dep}`);
      execSync(`"${brewPath}" install ${dep}`, {
        encoding: 'utf-8',
        stdio: 'pipe',
        timeout: 300000, // 5 minutes
      });
    } catch (depErr: unknown) {
      // Dependency might already be installed
      const message = depErr instanceof Error ? depErr.message : String(depErr);
      if (!message.includes('already installed')) {
        onLog?.(`Warning: Could not install dependency ${dep}`);
      }
    }
  }

  // Install the main package
  try {
    const isCask = plugin.brewPackage.includes('/tap/');
    const command = isCask
      ? `"${brewPath}" install --cask ${plugin.brewPackage}`
      : `"${brewPath}" install ${plugin.brewPackage}`;

    onLog?.(`Running: ${command}`);
    execSync(command, {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 300000, // 5 minutes
    });

    onLog?.(`Successfully installed ${plugin.displayName}`);
    return ok(undefined);
  } catch (installErr: unknown) {
    const message = installErr instanceof Error ? installErr.message : String(installErr);
    return err(new Error(`Failed to install ${plugin.displayName}: ${message}`));
  }
}

/**
 * Get list of available plugins
 */
export function getAvailablePlugins(): PluginName[] {
  return typedKeys(PLUGIN_DEFINITIONS);
}
