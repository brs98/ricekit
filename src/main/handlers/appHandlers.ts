/**
 * Application IPC Handlers
 * Handles application detection, setup, and refresh
 */
import { ipcMain, clipboard, IpcMainInvokeEvent } from 'electron';
import path from 'path';
import type { AppInfo } from '../../shared/types';
import { getErrorMessage } from '../../shared/errors';
import { logger } from '../logger';
import { handleGetPreferences, handleSetPreferences } from './preferencesHandlers';
import { setupApp as coreSetupApp, previewSetup as corePreviewSetup, type SetupResult, type SetupPreview } from '../../core/apps/setup';
import { detectApps } from '../../core/apps';
import { getAdapter } from '../../core/apps/registry';
import { getPathProvider } from '../../core/paths';

/**
 * Detect installed applications
 */
export async function handleDetectApps(): Promise<AppInfo[]> {
  logger.info('Detecting installed applications');
  const detectedApps = await detectApps();
  logger.info(`Detected ${detectedApps.filter((a) => a.isInstalled).length} installed apps`);
  return detectedApps;
}

/**
 * Setup an application for theming
 * Uses the refactored setup logic that:
 * - Creates config from template if none exists
 * - Copies snippet to clipboard if config exists
 * - Returns already_setup if integration exists
 */
export async function handleSetupApp(_event: IpcMainInvokeEvent | null, appName: string): Promise<SetupResult> {
  logger.info(`Setting up app: ${appName}`);

  try {
    const result = await coreSetupApp(appName);

    if (!result.success) {
      throw result.error;
    }

    const setupResult = result.data;

    // Handle each action type
    switch (setupResult.action) {
      case 'created':
        // Add to enabledApps
        await addAppToEnabledApps(appName);
        break;

      case 'clipboard':
        // Copy snippet to clipboard
        if (setupResult.snippet) {
          clipboard.writeText(setupResult.snippet);
        }

        // Add to enabledApps (user can run unsetup if they don't want auto-refresh)
        await addAppToEnabledApps(appName);
        break;

      case 'already_setup':
        // Ensure app is in enabledApps
        await addAppToEnabledApps(appName);
        break;
    }

    logger.info(`Setup ${appName}: ${setupResult.action}`);
    return setupResult;

  } catch (error: unknown) {
    logger.error(`Failed to setup ${appName}:`, error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to setup ${appName}: ${message}`);
  }
}

/**
 * Helper to add an app to enabledApps in preferences
 */
async function addAppToEnabledApps(appName: string): Promise<void> {
  const prefs = await handleGetPreferences();
  if (!prefs.enabledApps) {
    prefs.enabledApps = [];
  }
  if (!prefs.enabledApps.includes(appName)) {
    prefs.enabledApps.push(appName);
    await handleSetPreferences(null, prefs);
    logger.info(`Added ${appName} to enabled apps`);
  }
}

/**
 * Preview what setup would do without making changes
 * Returns information about what files would be created/modified
 */
export async function handlePreviewSetup(
  _event: IpcMainInvokeEvent | null,
  appName: string
): Promise<SetupPreview> {
  logger.info(`Previewing setup for: ${appName}`);

  const result = await corePreviewSetup(appName);

  if (!result.success) {
    throw result.error;
  }

  return result.data;
}

/**
 * Get the current theme path from the symlink.
 */
function getCurrentThemePath(): string {
  const paths = getPathProvider();
  return path.join(paths.getCurrentDir(), 'theme');
}

/**
 * Refresh an application's theme
 * Sends reload signal to supported applications via adapter
 */
export async function handleRefreshApp(_event: IpcMainInvokeEvent | null, appName: string): Promise<void> {
  logger.info(`Refreshing app: ${appName}`);

  try {
    const adapter = getAdapter(appName);

    if (!adapter?.notify) {
      logger.info(`App refresh not supported for ${appName}`);
      return;
    }

    const themePath = getCurrentThemePath();
    const success = await adapter.notify(themePath, (msg) => logger.info(msg));

    if (success) {
      logger.info(`${adapter.displayName} theme refreshed successfully`);
    } else {
      logger.info(`Could not refresh ${adapter.displayName} - may not be running or configured`);
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
  ipcMain.handle('apps:previewSetup', handlePreviewSetup);
  ipcMain.handle('apps:refresh', handleRefreshApp);
}
