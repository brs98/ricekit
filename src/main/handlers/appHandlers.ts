/**
 * Application IPC Handlers
 * Handles application detection, setup, and refresh
 */
import { ipcMain, clipboard, IpcMainInvokeEvent } from 'electron';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import type { AppInfo } from '../../shared/types';
import { getErrorMessage } from '../../shared/errors';
import { logger } from '../logger';
import {
  existsSync,
  copyFile,
  touch,
} from '../utils/asyncFs';
import { handleGetPreferences, handleSetPreferences } from './preferencesHandlers';
import { setupApp as coreSetupApp, previewSetup as corePreviewSetup, type SetupResult, type SetupPreview } from '../../core/apps/setup';
import { detectApps } from '../../core/apps';

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
 * Refresh an application's theme
 * Sends reload signal to supported applications
 */
export async function handleRefreshApp(_event: IpcMainInvokeEvent | null, appName: string): Promise<void> {
  logger.info(`Refreshing app: ${appName}`);

  try {
    switch (appName.toLowerCase()) {
      case 'wezterm':
        // WezTerm watches the wezterm-colors.lua file we manage
        // Re-copy the current theme to trigger a reload
        try {
          const currentThemePath = path.join(
            os.homedir(),
            'Library',
            'Application Support',
            'Ricekit',
            'current',
            'theme'
          );
          const weztermThemeSrc = path.join(currentThemePath, 'wezterm.lua');
          const weztermThemeDest = path.join(os.homedir(), 'Library', 'Application Support', 'Ricekit', 'wezterm-colors.lua');

          if (existsSync(weztermThemeSrc)) {
            // copyFile is atomic (no truncation race unlike writeFile)
            await copyFile(weztermThemeSrc, weztermThemeDest);

            // Touch WezTerm's primary config to force reload (more reliable than watch list)
            const weztermConfigPaths = [
              path.join(os.homedir(), '.wezterm.lua'),
              path.join(os.homedir(), '.config', 'wezterm', 'wezterm.lua'),
            ];
            for (const configPath of weztermConfigPaths) {
              if (existsSync(configPath)) {
                await touch(configPath);
                break;
              }
            }

            logger.info('WezTerm theme file updated - will auto-reload');
          } else {
            logger.info('WezTerm theme source not found');
          }
        } catch (err: unknown) {
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
          } catch (err: unknown) {
            logger.info('Could not refresh SketchyBar - it may not be running:', getErrorMessage(err));
          }
        } else {
          logger.info('SketchyBar binary not found');
        }
        break;
      }

      case 'aerospace':
        // AeroSpace uses JankyBorders for window borders
        // Re-run the borders command with updated colors from the theme
        try {
          const currentThemePath = path.join(
            os.homedir(),
            'Library',
            'Application Support',
            'Ricekit',
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
        } catch (err: unknown) {
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
  ipcMain.handle('apps:previewSetup', handlePreviewSetup);
  ipcMain.handle('apps:refresh', handleRefreshApp);
}
