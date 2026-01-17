/**
 * Preferences IPC Handlers
 * Handles user preferences management, backup, and restore
 */
import { ipcMain, dialog, IpcMainInvokeEvent } from 'electron';
import path from 'path';
import os from 'os';
import {
  getPreferencesPath,
  ensureDirectories,
  ensurePreferences,
} from '../directories';
import type { Preferences } from '../../shared/types';
import { logger } from '../logger';
import { readJson, writeJson, copyFile } from '../utils/asyncFs';

// Reference to scheduler functions - will be set by system handlers
let schedulerCallbacks: {
  startScheduler: () => void;
  stopScheduler: () => void;
} | null = null;

/**
 * Set scheduler callbacks for preference changes
 */
export function setSchedulerCallbacks(callbacks: {
  startScheduler: () => void;
  stopScheduler: () => void;
}): void {
  schedulerCallbacks = callbacks;
}

/**
 * Get user preferences
 */
export async function handleGetPreferences(): Promise<Preferences> {
  ensureDirectories();
  ensurePreferences(); // This now validates and repairs corrupted files
  const prefsPath = getPreferencesPath();

  try {
    return await readJson<Preferences>(prefsPath);
  } catch (error) {
    // This should never happen after ensurePreferences(), but just in case...
    logger.error('Failed to read preferences after validation:', error);
    // Import the function to get defaults
    const { getDefaultPreferences } = await import('../directories');
    return getDefaultPreferences();
  }
}

/**
 * Set user preferences
 */
export async function handleSetPreferences(_event: IpcMainInvokeEvent | null, prefs: Preferences): Promise<void> {
  ensureDirectories();
  ensurePreferences();
  const prefsPath = getPreferencesPath();

  // Read old preferences to detect changes
  const oldPrefs = await readJson<Preferences>(prefsPath);

  // Write new preferences
  await writeJson(prefsPath, prefs);
  logger.info('Preferences updated');

  // Check if showInMenuBar preference changed
  if (oldPrefs.showInMenuBar !== prefs.showInMenuBar) {
    try {
      const { updateTrayVisibility } = await import('../main');
      updateTrayVisibility(prefs.showInMenuBar);
      logger.info(`Menu bar icon ${prefs.showInMenuBar ? 'shown' : 'hidden'}`);
    } catch (err) {
      logger.error('Failed to update tray visibility:', err);
    }
  }

  // Check if keyboard shortcut changed
  if (oldPrefs.keyboardShortcuts.quickSwitcher !== prefs.keyboardShortcuts.quickSwitcher) {
    try {
      const { updateQuickSwitcherShortcut } = await import('../main');
      updateQuickSwitcherShortcut(prefs.keyboardShortcuts.quickSwitcher);
      logger.info(`Keyboard shortcut updated to: ${prefs.keyboardShortcuts.quickSwitcher}`);
    } catch (err) {
      logger.error('Failed to update keyboard shortcut:', err);
    }
  }

  // Check if schedule changed - restart scheduler to pick up new schedules
  const oldScheduleEnabled = oldPrefs.schedule?.enabled || false;
  const newScheduleEnabled = prefs.schedule?.enabled || false;
  const oldSchedulesJson = JSON.stringify(oldPrefs.schedule?.schedules || []);
  const newSchedulesJson = JSON.stringify(prefs.schedule?.schedules || []);

  if (oldScheduleEnabled !== newScheduleEnabled || oldSchedulesJson !== newSchedulesJson) {
    logger.info('Schedule preferences changed, restarting scheduler');
    if (schedulerCallbacks) {
      schedulerCallbacks.stopScheduler();
      if (newScheduleEnabled) {
        schedulerCallbacks.startScheduler();
      }
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
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['createDirectory', 'showOverwriteConfirmation'],
    });

    if (!filePath) {
      // User cancelled
      return null;
    }

    // Read current preferences
    const prefsPath = getPreferencesPath();
    const prefs = await readJson<Preferences>(prefsPath);

    // Add metadata to backup
    const backup = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      preferences: prefs,
    };

    // Write to backup file
    await writeJson(filePath, backup);
    logger.info('Preferences backed up to:', filePath);

    return filePath;
  } catch (err) {
    logger.error('Failed to backup preferences:', err);
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
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (!filePaths || filePaths.length === 0) {
      // User cancelled
      return false;
    }

    const backupPath = filePaths[0];

    // Read and parse backup file
    const backup = await readJson<{ version: string; timestamp: string; preferences: Preferences }>(backupPath);

    // Validate backup structure
    if (!backup.preferences) {
      throw new Error('Invalid backup file: missing preferences data');
    }

    // Restore preferences
    const prefsPath = getPreferencesPath();

    // Create backup of current preferences before restoring
    const currentBackupPath = `${prefsPath}.pre-restore-${Date.now()}.bak`;
    await copyFile(prefsPath, currentBackupPath);
    logger.info(`Created safety backup at: ${currentBackupPath}`);

    // Write restored preferences
    await writeJson(prefsPath, backup.preferences);
    logger.info('Preferences restored from:', backupPath);

    // Update tray visibility if showInMenuBar changed
    try {
      const { updateTrayVisibility } = await import('../main');
      updateTrayVisibility(backup.preferences.showInMenuBar || false);
    } catch (err) {
      logger.error('Failed to update tray visibility after restore:', err);
    }

    return true;
  } catch (err) {
    logger.error('Failed to restore preferences:', err);
    throw new Error('Failed to restore preferences: ' + (err as Error).message);
  }
}

/**
 * Register preferences IPC handlers
 */
export function registerPreferencesHandlers(): void {
  ipcMain.handle('preferences:get', handleGetPreferences);
  ipcMain.handle('preferences:set', handleSetPreferences);
  ipcMain.handle('preferences:backup', handleBackupPreferences);
  ipcMain.handle('preferences:restore', handleRestorePreferences);
}
