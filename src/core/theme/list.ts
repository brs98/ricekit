/**
 * Theme listing operations
 */

import path from 'path';
import type { Theme, ThemeMetadata } from '../../shared/types';
import { existsSync, readJson, readDir, isDirectory } from '../utils/fs';
import { getPathProvider } from '../paths';

/**
 * Load a single theme from directory
 */
export async function loadTheme(
  themePath: string,
  themeName: string,
  isCustom: boolean
): Promise<Theme | null> {
  const metadataPath = path.join(themePath, 'theme.json');

  if (!existsSync(metadataPath)) {
    return null;
  }

  try {
    const metadata = await readJson<ThemeMetadata>(metadataPath);

    // Check if this is a light theme (based on light.mode file)
    const isLight = existsSync(path.join(themePath, 'light.mode'));

    return {
      name: themeName,
      path: themePath,
      metadata,
      isCustom,
      isLight,
    };
  } catch {
    return null;
  }
}

/**
 * Load themes from a directory
 */
async function loadThemesFromDir(dir: string, isCustom: boolean): Promise<Theme[]> {
  if (!existsSync(dir)) return [];

  const themeNames = await readDir(dir);
  const themePromises = themeNames.map(async (themeName) => {
    const themePath = path.join(dir, themeName);
    if (await isDirectory(themePath)) {
      return loadTheme(themePath, themeName, isCustom);
    }
    return null;
  });

  const results = await Promise.all(themePromises);
  return results.filter((theme): theme is Theme => theme !== null);
}

/**
 * List all available themes
 */
export async function listThemes(): Promise<Theme[]> {
  const paths = getPathProvider();
  const themesDir = paths.getThemesDir();
  const customThemesDir = paths.getCustomThemesDir();

  // Load bundled and custom themes in parallel
  const [bundledThemes, customThemes] = await Promise.all([
    loadThemesFromDir(themesDir, false),
    loadThemesFromDir(customThemesDir, true),
  ]);

  return [...bundledThemes, ...customThemes];
}

/**
 * Get a specific theme by name
 */
export async function getTheme(name: string): Promise<Theme | null> {
  const themes = await listThemes();
  return themes.find((t) => t.name === name) || null;
}

/**
 * Get the current theme name from state
 */
export async function getCurrentThemeName(): Promise<string | null> {
  const paths = getPathProvider();
  const statePath = paths.getStatePath();

  if (!existsSync(statePath)) {
    return null;
  }

  try {
    const state = await readJson<{ currentTheme?: string }>(statePath);
    return state.currentTheme || null;
  } catch {
    return null;
  }
}

/**
 * Get the current theme
 */
export async function getCurrentTheme(): Promise<Theme | null> {
  const name = await getCurrentThemeName();
  if (!name) return null;
  return getTheme(name);
}
