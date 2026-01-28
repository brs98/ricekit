/**
 * Wallpaper IPC Handlers
 * Handles wallpaper listing, applying, and management
 */
import { ipcMain, Notification, dialog, IpcMainInvokeEvent } from 'electron';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import { getThemesDir, getCustomThemesDir, getStatePath, getCurrentDir } from '../directories';
import type { State } from '../../shared/types';
import { getErrorMessage, isNodeError } from '../../shared/errors';
import { logger } from '../logger';
import { generateThumbnails, clearOldThumbnails, getThumbnailCacheStats } from '../thumbnails';
import {
  readJson,
  writeJson,
  readDir,
  existsSync,
  ensureDir,
  copyFile,
  unlink,
  readSymlink,
  createSymlink,
} from '../utils/asyncFs';
import type { ApplyOptions } from './systemHandlers';
import { handleGetPreferences, handleSetPreferences } from './preferencesHandlers';

/**
 * List wallpapers for a theme
 */
export async function handleListWallpapers(_event: IpcMainInvokeEvent | null, themeName: string): Promise<string[]> {
  logger.info(`Listing wallpapers for theme: ${themeName}`);

  try {
    const themesDir = getThemesDir();
    const customThemesDir = getCustomThemesDir();

    // Try bundled themes first
    let themePath = path.join(themesDir, themeName);
    if (!existsSync(themePath)) {
      // Try custom themes
      themePath = path.join(customThemesDir, themeName);
    }

    const wallpapersDir = path.join(themePath, 'wallpapers');

    if (!existsSync(wallpapersDir)) {
      logger.info(`No wallpapers directory found for theme: ${themeName}`);
      return [];
    }

    const files = await readDir(wallpapersDir);
    const imageFiles = files.filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return ['.png', '.jpg', '.jpeg', '.heic', '.webp'].includes(ext);
    });

    // Return full paths to the wallpaper files
    const wallpaperPaths = imageFiles.map((file) => path.join(wallpapersDir, file));

    logger.info(`Found ${wallpaperPaths.length} wallpapers for theme: ${themeName}`);
    return wallpaperPaths;
  } catch (error: unknown) {
    logger.error(`Error listing wallpapers for theme ${themeName}:`, getErrorMessage(error));
    return [];
  }
}

/**
 * List wallpapers with thumbnails for better performance
 * Returns an array of objects with original path and thumbnail path
 */
async function handleListWallpapersWithThumbnails(
  _event: IpcMainInvokeEvent,
  themeName: string
): Promise<Array<{ original: string; thumbnail: string }>> {
  logger.info(`Listing wallpapers with thumbnails for theme: ${themeName}`);

  try {
    // Get all wallpaper paths
    const wallpaperPaths = await handleListWallpapers(_event, themeName);

    if (wallpaperPaths.length === 0) {
      return [];
    }

    // Generate thumbnails
    logger.info(`Generating thumbnails for ${wallpaperPaths.length} wallpapers...`);
    const thumbnailMap = await generateThumbnails(wallpaperPaths);

    // Build result array
    const result = wallpaperPaths.map((originalPath) => ({
      original: originalPath,
      thumbnail: thumbnailMap.get(originalPath) || originalPath,
    }));

    logger.info(`Successfully generated ${result.length} thumbnails`);
    return result;
  } catch (error: unknown) {
    logger.error(`Error listing wallpapers with thumbnails for theme ${themeName}:`, getErrorMessage(error));
    // Fallback: return original paths
    const wallpaperPaths = await handleListWallpapers(_event, themeName);
    return wallpaperPaths.map((p) => ({ original: p, thumbnail: p }));
  }
}

/**
 * Clear thumbnail cache
 */
async function handleClearThumbnailCache(): Promise<void> {
  try {
    logger.info('Clearing thumbnail cache...');
    await clearOldThumbnails();
    logger.info('Thumbnail cache cleared successfully');
  } catch (error: unknown) {
    logger.error('Error clearing thumbnail cache:', getErrorMessage(error));
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Get thumbnail cache statistics
 */
async function handleGetThumbnailCacheStats(): Promise<{ count: number; sizeBytes: number; sizeMB: number }> {
  try {
    const stats = await getThumbnailCacheStats();
    return {
      ...stats,
      sizeMB: Math.round((stats.sizeBytes / (1024 * 1024)) * 100) / 100,
    };
  } catch (error: unknown) {
    logger.error('Error getting thumbnail cache stats:', getErrorMessage(error));
    return { count: 0, sizeBytes: 0, sizeMB: 0 };
  }
}

/**
 * Apply a wallpaper
 */
export async function handleApplyWallpaper(
  _event: IpcMainInvokeEvent | null,
  wallpaperPath: string,
  displayIndex?: number,
  options?: ApplyOptions
): Promise<void> {
  logger.info(
    `Applying wallpaper: ${wallpaperPath}`,
    displayIndex !== undefined ? `to display ${displayIndex}` : 'to all displays'
  );

  try {
    const execAsync = promisify(exec);

    // Check if wallpaper file exists
    if (!existsSync(wallpaperPath)) {
      throw new Error(`Wallpaper file not found: ${wallpaperPath}`);
    }

    // Use osascript to set the wallpaper
    let script: string;

    if (displayIndex !== undefined && displayIndex !== null) {
      // Set wallpaper for specific display (1-indexed)
      script = `
        tell application "System Events"
          set picture of desktop ${displayIndex} to "${wallpaperPath}"
        end tell
      `;
    } else {
      // Set wallpaper for all displays
      script = `
        tell application "System Events"
          tell every desktop
            set picture to "${wallpaperPath}"
          end tell
        end tell
      `;
    }

    await execAsync(`osascript -e '${script}'`);

    // Create symlink to current wallpaper
    const currentDir = getCurrentDir();
    const wallpaperSymlink = path.join(currentDir, 'wallpaper');

    // Remove existing symlink/file if it exists
    // Note: Always try to unlink first because existsSync() follows symlinks
    // and returns false for broken symlinks, but the symlink itself still exists
    try {
      await unlink(wallpaperSymlink);
    } catch (err: unknown) {
      // Ignore ENOENT (file doesn't exist), re-throw other errors
      if (!isNodeError(err) || err.code !== 'ENOENT') {
        throw err;
      }
    }

    // Create new symlink
    await createSymlink(wallpaperPath, wallpaperSymlink, 'file');

    // Update state with current wallpaper
    const statePath = getStatePath();
    const state: State = await readJson<State>(statePath);
    state.currentWallpaper = wallpaperPath;
    await writeJson(statePath, state);

    // If this is a manual apply (not from scheduler), disable scheduling
    if (!options?.fromScheduler) {
      try {
        const prefs = await handleGetPreferences();
        if (prefs.schedule?.enabled) {
          logger.info('Manual wallpaper apply detected, disabling scheduling');
          await handleSetPreferences(null, {
            ...prefs,
            schedule: {
              ...prefs.schedule,
              enabled: false,
            },
          });
        }
      } catch (err: unknown) {
        logger.error('Failed to disable scheduling after manual apply:', getErrorMessage(err));
      }
    }

    // Show notification
    if (Notification.isSupported()) {
      const body =
        displayIndex !== undefined && displayIndex !== null
          ? `Wallpaper updated for Display ${displayIndex}`
          : `Wallpaper updated for all displays`;

      const notification = new Notification({
        title: 'Wallpaper Applied',
        body,
        silent: false,
      });
      notification.show();
    }

    logger.info(`Wallpaper applied successfully: ${wallpaperPath}`);
  } catch (error: unknown) {
    logger.error(`Error applying wallpaper:`, getErrorMessage(error));
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Get list of connected displays
 */
interface DisplayInfo {
  id: string;
  index: number;
  name: string;
  resolution: string;
  isMain: boolean;
}

interface SystemProfilerDisplay {
  _name?: string;
  _spdisplays_resolution?: string;
  spdisplays_main?: string;
}

interface SystemProfilerGPU {
  spdisplays_ndrvs?: SystemProfilerDisplay[];
}

interface SystemProfilerData {
  SPDisplaysDataType?: SystemProfilerGPU[];
}

async function handleGetDisplays(): Promise<DisplayInfo[]> {
  logger.info('Getting connected displays');

  try {
    const execAsync = promisify(exec);

    // Use system_profiler to get display information
    const { stdout } = await execAsync('system_profiler SPDisplaysDataType -json');
    const data: SystemProfilerData = JSON.parse(stdout);

    const displays: DisplayInfo[] = [];

    // Parse the display data
    if (data.SPDisplaysDataType && data.SPDisplaysDataType.length > 0) {
      data.SPDisplaysDataType.forEach((gpu: SystemProfilerGPU, gpuIndex: number) => {
        if (gpu.spdisplays_ndrvs && Array.isArray(gpu.spdisplays_ndrvs)) {
          gpu.spdisplays_ndrvs.forEach((display: SystemProfilerDisplay, displayIndex: number) => {
            displays.push({
              id: `display-${gpuIndex}-${displayIndex}`,
              index: displays.length + 1,
              name: display._name || `Display ${displays.length + 1}`,
              resolution: display._spdisplays_resolution || 'Unknown',
              isMain: display.spdisplays_main === 'spdisplays_yes',
            });
          });
        }
      });
    }

    // If no displays found, return at least one (the current display)
    if (displays.length === 0) {
      displays.push({
        id: 'display-0-0',
        index: 1,
        name: 'Display 1',
        resolution: 'Unknown',
        isMain: true,
      });
    }

    logger.info(`Found ${displays.length} display(s):`, displays);
    return displays;
  } catch (error: unknown) {
    logger.error('Error getting displays:', getErrorMessage(error));
    // Return a default display on error
    return [
      {
        id: 'display-0-0',
        index: 1,
        name: 'Display 1',
        resolution: 'Unknown',
        isMain: true,
      },
    ];
  }
}

/**
 * Add wallpaper(s) to a theme
 * Opens a file dialog and copies selected images to the theme's wallpapers directory
 */
async function handleAddWallpapers(_event: IpcMainInvokeEvent, themeName: string): Promise<{ added: string[]; errors: string[] }> {
  logger.info(`Adding wallpapers to theme: ${themeName}`);

  try {
    // Open file dialog to select images
    const result = await dialog.showOpenDialog({
      title: 'Select Wallpapers to Add',
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'heic', 'webp'] }],
      properties: ['openFile', 'multiSelections'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      logger.info('Wallpaper selection canceled');
      return { added: [], errors: [] };
    }

    // Find theme directory
    const themesDir = getThemesDir();
    const customThemesDir = getCustomThemesDir();

    let themePath = path.join(themesDir, themeName);
    if (!existsSync(themePath)) {
      themePath = path.join(customThemesDir, themeName);
    }

    if (!existsSync(themePath)) {
      throw new Error(`Theme not found: ${themeName}`);
    }

    // Ensure wallpapers directory exists
    const wallpapersDir = path.join(themePath, 'wallpapers');
    if (!existsSync(wallpapersDir)) {
      await ensureDir(wallpapersDir);
    }

    const added: string[] = [];
    const errors: string[] = [];

    // Copy each selected file to the wallpapers directory
    for (const sourcePath of result.filePaths) {
      try {
        const fileName = path.basename(sourcePath);
        let destPath = path.join(wallpapersDir, fileName);

        // Handle duplicate filenames by adding a suffix
        if (existsSync(destPath)) {
          const ext = path.extname(fileName);
          const baseName = path.basename(fileName, ext);
          let counter = 1;
          while (existsSync(destPath)) {
            destPath = path.join(wallpapersDir, `${baseName}-${counter}${ext}`);
            counter++;
          }
        }

        await copyFile(sourcePath, destPath);
        added.push(destPath);
        logger.info(`Added wallpaper: ${destPath}`);
      } catch (err: unknown) {
        const errorMsg = `Failed to copy ${sourcePath}: ${err instanceof Error ? err.message : String(err)}`;
        errors.push(errorMsg);
        logger.error(errorMsg);
      }
    }

    // Show notification
    if (Notification.isSupported() && added.length > 0) {
      const notification = new Notification({
        title: 'Wallpapers Added',
        body: `Added ${added.length} wallpaper${added.length > 1 ? 's' : ''} to ${themeName}`,
        silent: false,
      });
      notification.show();
    }

    return { added, errors };
  } catch (error: unknown) {
    logger.error(`Error adding wallpapers to theme ${themeName}:`, getErrorMessage(error));
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Remove a wallpaper from a theme
 */
async function handleRemoveWallpaper(_event: IpcMainInvokeEvent, wallpaperPath: string): Promise<void> {
  logger.info(`Removing wallpaper: ${wallpaperPath}`);

  try {
    // Verify the file exists
    if (!existsSync(wallpaperPath)) {
      throw new Error(`Wallpaper not found: ${wallpaperPath}`);
    }

    // Safety check: ensure the file is inside a wallpapers directory
    const parentDir = path.basename(path.dirname(wallpaperPath));
    if (parentDir !== 'wallpapers') {
      throw new Error('Cannot remove file: not in a wallpapers directory');
    }

    // Delete the file
    await unlink(wallpaperPath);
    logger.info(`Removed wallpaper: ${wallpaperPath}`);

    // Check if this was the current wallpaper and clear the symlink if so
    const currentDir = getCurrentDir();
    const wallpaperSymlink = path.join(currentDir, 'wallpaper');

    if (existsSync(wallpaperSymlink)) {
      try {
        const currentWallpaper = await readSymlink(wallpaperSymlink);
        if (currentWallpaper === wallpaperPath) {
          await unlink(wallpaperSymlink);
          // Update state to clear current wallpaper
          const statePath = getStatePath();
          const state: State = await readJson<State>(statePath);
          delete state.currentWallpaper;
          await writeJson(statePath, state);
          logger.info('Cleared current wallpaper reference');
        }
      } catch {
        // Symlink might not exist or be readable, ignore
      }
    }

    // Show notification
    if (Notification.isSupported()) {
      const fileName = path.basename(wallpaperPath);
      const notification = new Notification({
        title: 'Wallpaper Removed',
        body: `Removed ${fileName}`,
        silent: false,
      });
      notification.show();
    }
  } catch (error: unknown) {
    logger.error(`Error removing wallpaper:`, getErrorMessage(error));
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Register wallpaper IPC handlers
 */
export function registerWallpaperHandlers(): void {
  ipcMain.handle('wallpaper:list', handleListWallpapers);
  ipcMain.handle('wallpaper:listWithThumbnails', handleListWallpapersWithThumbnails);
  ipcMain.handle('wallpaper:apply', handleApplyWallpaper);
  ipcMain.handle('wallpaper:getDisplays', handleGetDisplays);
  ipcMain.handle('wallpaper:clearThumbnailCache', handleClearThumbnailCache);
  ipcMain.handle('wallpaper:getThumbnailCacheStats', handleGetThumbnailCacheStats);
  ipcMain.handle('wallpaper:add', handleAddWallpapers);
  ipcMain.handle('wallpaper:remove', handleRemoveWallpaper);
}
