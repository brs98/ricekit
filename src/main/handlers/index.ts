/**
 * IPC Handlers Index
 * Central registration point for all IPC handlers
 */
import { ipcMain, BrowserWindow } from 'electron';
import { logger } from '../logger';

// Import handler registration functions
import { registerThemeHandlers, handleApplyTheme, handleGetTheme, updateVSCodeSettings, updateCursorSettings } from './themeHandlers';
import { registerWallpaperHandlers, handleApplyWallpaper } from './wallpaperHandlers';
import { registerAppHandlers, setThemeHandlers } from './appHandlers';
import { registerPreferencesHandlers, setSchedulerCallbacks } from './preferencesHandlers';
import {
  registerSystemHandlers,
  handleAppearanceChange,
  checkScheduleAndApplyTheme,
  startWallpaperScheduler,
  stopWallpaperScheduler,
  setThemeApplyHandler,
  setWallpaperApplyHandler,
} from './systemHandlers';
import { registerStateHandlers, handleGetState } from './stateHandlers';
import { registerLoggingHandlers } from './loggingHandlers';

/**
 * Setup all IPC handlers
 */
export function setupIpcHandlers(): void {
  // Wire up cross-module dependencies to avoid circular imports
  // System handlers need theme and wallpaper apply functions
  setThemeApplyHandler(handleApplyTheme);
  setWallpaperApplyHandler(handleApplyWallpaper);

  // App handlers need theme-related functions
  setThemeHandlers({
    getTheme: handleGetTheme,
    updateVSCodeSettings,
    updateCursorSettings,
  });

  // Preferences handlers need scheduler functions
  setSchedulerCallbacks({
    startWallpaperScheduler,
    stopWallpaperScheduler,
  });

  // Register all handler groups
  registerThemeHandlers();
  registerWallpaperHandlers();
  registerAppHandlers();
  registerPreferencesHandlers();
  registerSystemHandlers();
  registerStateHandlers();
  registerLoggingHandlers();

  // Quick switcher handler (small, kept inline)
  ipcMain.handle('quickswitcher:close', async () => {
    const allWindows = BrowserWindow.getAllWindows();
    const quickSwitcher = allWindows.find((win) => win.getTitle() === '' && win.isAlwaysOnTop());
    if (quickSwitcher) {
      quickSwitcher.hide();
    }
  });

  logger.info('IPC handlers registered');
}

// Re-export functions needed by other modules
export {
  handleApplyTheme,
  handleAppearanceChange,
  checkScheduleAndApplyTheme,
  startWallpaperScheduler,
  stopWallpaperScheduler,
  handleGetState,
};
