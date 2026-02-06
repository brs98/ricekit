/**
 * Wallpaper operations
 */

import path from 'path';
import type { State } from '../../shared/types';
import { existsSync, readDir, readJson, writeJson, unlink, createSymlink } from '../utils/fs';
import { getPathProvider } from '../paths';
import { applyWallpaperToDesktops } from './apply';

/**
 * List wallpapers for a theme
 */
export async function listWallpapers(themeName: string): Promise<string[]> {
  const paths = getPathProvider();
  const themesDir = paths.getThemesDir();
  const customThemesDir = paths.getCustomThemesDir();

  // Try bundled themes first
  let themePath = path.join(themesDir, themeName);
  if (!existsSync(themePath)) {
    // Try custom themes
    themePath = path.join(customThemesDir, themeName);
  }

  const wallpapersDir = path.join(themePath, 'wallpapers');

  if (!existsSync(wallpapersDir)) {
    return [];
  }

  const files = await readDir(wallpapersDir);
  const imageFiles = files.filter((file) => {
    const ext = path.extname(file).toLowerCase();
    return ['.png', '.jpg', '.jpeg', '.heic', '.webp'].includes(ext);
  });

  // Return full paths
  return imageFiles.map((file) => path.join(wallpapersDir, file));
}

/**
 * Apply a wallpaper using macOS System Events
 */
export async function applyWallpaper(
  wallpaperPath: string,
  displayIndex?: number
): Promise<void> {
  if (!existsSync(wallpaperPath)) {
    throw new Error(`Wallpaper file not found: ${wallpaperPath}`);
  }

  await applyWallpaperToDesktops(wallpaperPath, { displayIndex });

  // Create symlink to current wallpaper
  const paths = getPathProvider();
  const currentDir = paths.getCurrentDir();
  const wallpaperSymlink = path.join(currentDir, 'wallpaper');

  // Remove existing symlink/file if it exists
  try {
    await unlink(wallpaperSymlink);
  } catch {
    // Ignore ENOENT
  }

  // Create new symlink
  await createSymlink(wallpaperPath, wallpaperSymlink, 'file');

  // Update state with current wallpaper
  const statePath = paths.getStatePath();
  const state: State = await readJson<State>(statePath);
  state.currentWallpaper = wallpaperPath;
  await writeJson(statePath, state);
}

/**
 * Get the current wallpaper path
 */
export async function getCurrentWallpaper(): Promise<string | null> {
  const paths = getPathProvider();
  const statePath = paths.getStatePath();

  if (!existsSync(statePath)) {
    return null;
  }

  try {
    const state = await readJson<State>(statePath);
    return state.currentWallpaper || null;
  } catch {
    return null;
  }
}
