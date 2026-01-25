/**
 * State operations
 */

import type { State } from '../../shared/types';
import { existsSync, readJson, writeJson } from '../utils/fs';
import { getPathProvider } from '../paths';
import { APP_CONFIG } from '../../shared/constants';

/**
 * Get the default state
 */
export function getDefaultState(): State {
  return {
    currentTheme: APP_CONFIG.defaultTheme,
    lastSwitched: Date.now(),
  };
}

/**
 * Get current application state
 */
export async function getState(): Promise<State> {
  const paths = getPathProvider();
  const statePath = paths.getStatePath();

  if (!existsSync(statePath)) {
    return getDefaultState();
  }

  try {
    return await readJson<State>(statePath);
  } catch {
    return getDefaultState();
  }
}

/**
 * Save application state
 */
export async function saveState(state: State): Promise<void> {
  const paths = getPathProvider();
  await writeJson(paths.getStatePath(), state);
}

/**
 * Get current theme name
 */
export async function getCurrentThemeName(): Promise<string> {
  const state = await getState();
  return state.currentTheme;
}

/**
 * Get current wallpaper path
 */
export async function getCurrentWallpaper(): Promise<string | null> {
  const state = await getState();
  return state.currentWallpaper || null;
}
