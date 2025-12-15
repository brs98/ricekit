/**
 * Logging IPC Handlers
 * Handles log file operations and debug logging settings
 */
import { ipcMain } from 'electron';
import { getPreferencesPath } from '../directories';
import type { Preferences } from '../../shared/types';
import { logger } from '../logger';
import { readJson, writeJson } from '../utils/asyncFs';

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
    const prefs = await readJson<Preferences>(prefsPath);
    prefs.debugLogging = enabled;
    await writeJson(prefsPath, prefs);
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
 * Register logging IPC handlers
 */
export function registerLoggingHandlers(): void {
  ipcMain.handle('logging:getDirectory', handleGetLogDirectory);
  ipcMain.handle('logging:getLogFile', handleGetLogFile);
  ipcMain.handle('logging:clearLogs', handleClearLogs);
  ipcMain.handle('logging:setDebugEnabled', handleSetDebugEnabled);
  ipcMain.handle('logging:isDebugEnabled', handleIsDebugEnabled);
}
