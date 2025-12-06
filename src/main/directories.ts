import { app } from 'electron';
import fs from 'fs';
import path from 'path';

/**
 * Get the MacTheme application data directory
 */
export function getAppDataDir(): string {
  return path.join(app.getPath('appData'), 'MacTheme');
}

/**
 * Get path to themes directory
 */
export function getThemesDir(): string {
  return path.join(getAppDataDir(), 'themes');
}

/**
 * Get path to custom themes directory
 */
export function getCustomThemesDir(): string {
  return path.join(getAppDataDir(), 'custom-themes');
}

/**
 * Get path to current theme symlink directory
 */
export function getCurrentDir(): string {
  return path.join(getAppDataDir(), 'current');
}

/**
 * Get path to preferences file
 */
export function getPreferencesPath(): string {
  return path.join(getAppDataDir(), 'preferences.json');
}

/**
 * Get path to state file
 */
export function getStatePath(): string {
  return path.join(getAppDataDir(), 'state.json');
}

/**
 * Create all required directories for MacTheme
 */
export function ensureDirectories(): void {
  const dirs = [
    getAppDataDir(),
    getThemesDir(),
    getCustomThemesDir(),
    getCurrentDir(),
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  }
}

/**
 * Initialize preferences file with defaults if it doesn't exist
 */
export function ensurePreferences(): void {
  const prefsPath = getPreferencesPath();

  if (!fs.existsSync(prefsPath)) {
    const defaultPreferences = {
      defaultLightTheme: 'catppuccin-latte',
      defaultDarkTheme: 'tokyo-night',
      enabledApps: [],
      favorites: [],
      recentThemes: [],
      keyboardShortcuts: {
        quickSwitcher: 'CommandOrControl+Shift+T',
      },
      autoSwitch: {
        enabled: false,
        mode: 'system',
      },
      startAtLogin: false,
      showInMenuBar: true,
      showNotifications: true,
    };

    fs.writeFileSync(prefsPath, JSON.stringify(defaultPreferences, null, 2));
    console.log(`Created preferences file: ${prefsPath}`);
  }
}

/**
 * Initialize state file with defaults if it doesn't exist
 */
export function ensureState(): void {
  const statePath = getStatePath();

  if (!fs.existsSync(statePath)) {
    const defaultState = {
      currentTheme: 'tokyo-night',
      lastSwitched: Date.now(),
    };

    fs.writeFileSync(statePath, JSON.stringify(defaultState, null, 2));
    console.log(`Created state file: ${statePath}`);
  }
}

/**
 * Initialize all MacTheme directories and files
 */
export function initializeApp(): void {
  console.log('Initializing MacTheme application directories...');
  ensureDirectories();
  ensurePreferences();
  ensureState();
  console.log('MacTheme initialization complete!');
}
