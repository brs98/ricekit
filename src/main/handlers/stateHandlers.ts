/**
 * State IPC Handlers
 * Handles application state and UI state persistence
 */
import { ipcMain } from 'electron';
import {
  getStatePath,
  getUIStatePath,
  ensureDirectories,
  ensureState,
} from '../directories';
import type { State } from '../../shared/types';
import { logger } from '../logger';
import { readJson, writeJson, existsSync, unlink } from '../utils/asyncFs';

/**
 * Get current application state
 */
export async function handleGetState(): Promise<State> {
  ensureDirectories();
  ensureState();
  const statePath = getStatePath();
  return await readJson<State>(statePath);
}

/**
 * Save UI state for crash recovery
 * Saves the current view, filters, search query, etc.
 */
async function handleSaveUIState(_event: any, uiState: any): Promise<void> {
  try {
    const uiStatePath = getUIStatePath();
    const stateToSave = {
      ...uiState,
      timestamp: Date.now(),
    };
    await writeJson(uiStatePath, stateToSave);
    logger.debug('UI state saved for crash recovery', stateToSave);
  } catch (error) {
    logger.error('Failed to save UI state', error);
    // Don't throw - we don't want UI state saving to break the app
  }
}

/**
 * Get saved UI state for crash recovery
 * Returns null if no saved state exists or if it's too old (>24 hours)
 */
async function handleGetUIState(): Promise<any | null> {
  try {
    const uiStatePath = getUIStatePath();

    if (!existsSync(uiStatePath)) {
      logger.debug('No UI state file found');
      return null;
    }

    const uiState = await readJson<any>(uiStatePath);

    // Check if state is not too old (24 hours = 86400000 ms)
    const stateAge = Date.now() - (uiState.timestamp || 0);
    if (stateAge > 86400000) {
      logger.info('UI state is too old, ignoring', { ageHours: Math.round(stateAge / 3600000) });
      // Delete old state file
      await unlink(uiStatePath);
      return null;
    }

    logger.debug('UI state restored from crash recovery', uiState);
    return uiState;
  } catch (error) {
    logger.error('Failed to load UI state', error);
    return null;
  }
}

/**
 * Register state IPC handlers
 */
export function registerStateHandlers(): void {
  ipcMain.handle('state:get', handleGetState);
  ipcMain.handle('uistate:save', handleSaveUIState);
  ipcMain.handle('uistate:get', handleGetUIState);
}
