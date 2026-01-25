/**
 * Path provider implementations
 *
 * Provides paths to application directories and files.
 * CLI and Electron use different implementations.
 */

import path from 'path';
import os from 'os';
import type { PathProvider } from './interfaces';
import { APP_CONFIG } from '../shared/constants';

/**
 * Create a path provider for CLI context.
 * Uses os.homedir() to build paths without Electron dependencies.
 */
export function createCliPathProvider(): PathProvider {
  const appDataDir = path.join(
    os.homedir(),
    'Library',
    'Application Support',
    APP_CONFIG.dataDirName
  );

  return {
    getAppDataDir: () => appDataDir,
    getThemesDir: () => path.join(appDataDir, 'themes'),
    getCustomThemesDir: () => path.join(appDataDir, 'custom-themes'),
    getCurrentDir: () => path.join(appDataDir, 'current'),
    getPresetsDir: () => path.join(appDataDir, 'presets'),
    getCurrentPresetsDir: () => path.join(appDataDir, 'current', 'presets'),
    getPreferencesPath: () => path.join(appDataDir, 'preferences.json'),
    getStatePath: () => path.join(appDataDir, 'state.json'),
    getUIStatePath: () => path.join(appDataDir, 'ui-state.json'),
    getLogDir: () => path.join(appDataDir, 'logs'),
  };
}

/**
 * Default CLI path provider instance
 */
let defaultPathProvider: PathProvider | null = null;

/**
 * Get the default path provider (creates one if not set)
 */
export function getPathProvider(): PathProvider {
  if (!defaultPathProvider) {
    defaultPathProvider = createCliPathProvider();
  }
  return defaultPathProvider;
}

/**
 * Set a custom path provider (useful for testing or Electron context)
 */
export function setPathProvider(provider: PathProvider): void {
  defaultPathProvider = provider;
}
