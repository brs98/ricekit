/**
 * Preferences operations
 */

import type { Preferences } from '../../shared/types';
import { existsSync, readJson, writeJson, ensureDir } from '../utils/fs';
import { getPathProvider } from '../paths';
import path from 'path';

/**
 * Get default preferences
 */
export function getDefaultPreferences(): Preferences {
  return {
    enabledApps: [],
    favorites: [],
    recentThemes: [],
    keyboardShortcuts: {
      quickSwitcher: 'Cmd+Shift+T',
      cycleWallpaper: 'Cmd+Shift+W',
    },
    startAtLogin: false,
    showInMenuBar: true,
    showNotifications: false,
    notifications: {
      onThemeChange: false,
      onScheduledSwitch: false,
    },
    onboardingCompleted: false,
  };
}

/**
 * Ensure preferences file exists with defaults
 */
export async function ensurePreferences(): Promise<void> {
  const paths = getPathProvider();
  const prefsPath = paths.getPreferencesPath();

  // Ensure directory exists
  const dir = path.dirname(prefsPath);
  await ensureDir(dir);

  if (!existsSync(prefsPath)) {
    await writeJson(prefsPath, getDefaultPreferences());
    return;
  }

  // Validate and merge with defaults
  try {
    const prefs = await readJson<Partial<Preferences>>(prefsPath);
    const merged = { ...getDefaultPreferences(), ...prefs };
    await writeJson(prefsPath, merged);
  } catch {
    // File corrupted, reset to defaults
    await writeJson(prefsPath, getDefaultPreferences());
  }
}

/**
 * Get user preferences
 */
export async function getPreferences(): Promise<Preferences> {
  const paths = getPathProvider();
  const prefsPath = paths.getPreferencesPath();

  if (!existsSync(prefsPath)) {
    await ensurePreferences();
  }

  try {
    return await readJson<Preferences>(prefsPath);
  } catch {
    return getDefaultPreferences();
  }
}

/**
 * Save user preferences
 */
export async function savePreferences(prefs: Preferences): Promise<void> {
  const paths = getPathProvider();
  await writeJson(paths.getPreferencesPath(), prefs);
}

/**
 * Update specific preference fields
 */
export async function updatePreferences(
  updates: Partial<Preferences>
): Promise<Preferences> {
  const prefs = await getPreferences();
  const updated = { ...prefs, ...updates };
  await savePreferences(updated);
  return updated;
}
