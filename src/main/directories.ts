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
 * Get default preferences object
 */
export function getDefaultPreferences() {
  return {
    defaultLightTheme: 'catppuccin-latte',
    defaultDarkTheme: 'tokyo-night',
    enabledApps: [] as string[],
    favorites: [] as string[],
    recentThemes: [] as string[],
    keyboardShortcuts: {
      quickSwitcher: 'Cmd+Shift+T',
    },
    autoSwitch: {
      enabled: false,
      mode: 'system' as 'system' | 'schedule' | 'sunset',
    },
    startAtLogin: false,
    showInMenuBar: true,
    showNotifications: true,
    notifications: {
      onThemeChange: true,
      onScheduledSwitch: true,
    },
    onboardingCompleted: false,
  };
}

/**
 * Initialize preferences file with defaults if it doesn't exist
 * Also validates and repairs corrupted preferences files
 */
export function ensurePreferences(): void {
  const prefsPath = getPreferencesPath();
  const defaultPreferences = getDefaultPreferences();

  // If file doesn't exist, create it
  if (!fs.existsSync(prefsPath)) {
    fs.writeFileSync(prefsPath, JSON.stringify(defaultPreferences, null, 2));
    console.log(`Created preferences file: ${prefsPath}`);
    return;
  }

  // If file exists, validate it's valid JSON and merge with defaults
  try {
    const content = fs.readFileSync(prefsPath, 'utf-8');
    const existingPrefs = JSON.parse(content); // This will throw if JSON is invalid

    // Merge existing preferences with defaults to add any missing fields
    const mergedPrefs = { ...defaultPreferences, ...existingPrefs };

    // Check if any new fields were added
    const hasNewFields = Object.keys(defaultPreferences).some(
      key => !(key in existingPrefs)
    );

    // If new fields were added, update the file
    if (hasNewFields) {
      fs.writeFileSync(prefsPath, JSON.stringify(mergedPrefs, null, 2));
      console.log(`Updated preferences with new fields: ${prefsPath}`);
    }
  } catch (error) {
    // File exists but contains invalid JSON - log error and recreate with defaults
    console.error(`Corrupted preferences file detected: ${prefsPath}`);
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);

    // Backup the corrupted file
    try {
      const backupPath = `${prefsPath}.corrupted.${Date.now()}.backup`;
      fs.copyFileSync(prefsPath, backupPath);
      console.log(`Backed up corrupted file to: ${backupPath}`);
    } catch (backupError) {
      console.error('Failed to backup corrupted file:', backupError);
    }

    // Replace with default preferences
    fs.writeFileSync(prefsPath, JSON.stringify(defaultPreferences, null, 2));
    console.log(`Replaced corrupted preferences with defaults: ${prefsPath}`);
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
