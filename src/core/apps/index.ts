/**
 * App detection and setup operations
 */

import type { AppInfo } from '../../shared/types';
import { existsSync, readFile } from '../utils/fs';
import { hasRicekitIntegration } from './setup';
import { getAllAdapters, resolveConfigPath } from './registry';
import type { AppAdapter } from './adapter';

// Ensure all adapters are registered
import './adapters';

// Re-export setup functions and types
export * from './setup';
export type { SetupResult } from './setup';

/**
 * Check if an app's config has Ricekit integration.
 * Delegates to adapter's checkIntegration() if provided, else default file-read.
 */
async function checkIntegration(adapter: AppAdapter, configPath: string): Promise<boolean> {
  if (!existsSync(configPath)) return false;

  if (adapter.checkIntegration) {
    return adapter.checkIntegration(configPath);
  }

  // Default: read file and check content
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
  const adapters = getAllAdapters();

  return Promise.all(
    adapters.map(async (adapter) => {
      const isInstalled = adapter.installPaths.some((p) => existsSync(p));
      const configPath = resolveConfigPath(adapter);
      const isConfigured = existsSync(configPath);
      const hasIntegration = isInstalled && isConfigured
        ? await checkIntegration(adapter, configPath)
        : false;

      return {
        name: adapter.name,
        displayName: adapter.displayName,
        category: adapter.category,
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
