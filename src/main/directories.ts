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
 * Get path to UI state file (for crash recovery)
 */
export function getUIStatePath(): string {
  return path.join(getAppDataDir(), 'ui-state.json');
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
    dynamicWallpaper: {
      enabled: false,
    },
    wallpaperSchedule: {
      enabled: false,
      schedules: [],
    },
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
 * Ensure the theme symlink exists and points to the current theme
 * This is critical for theme switching to work correctly
 */
export function ensureThemeSymlink(): void {
  const statePath = getStatePath();
  const currentDir = getCurrentDir();
  const symlinkPath = path.join(currentDir, 'theme');

  // Check if symlink already exists and is valid
  if (fs.existsSync(symlinkPath)) {
    const stats = fs.lstatSync(symlinkPath);
    if (stats.isSymbolicLink()) {
      // Symlink exists, verify it points to a valid theme
      try {
        const target = fs.readlinkSync(symlinkPath);
        if (fs.existsSync(target)) {
          console.log(`Theme symlink already exists: ${symlinkPath} -> ${target}`);
          return;
        } else {
          // Symlink points to non-existent theme, remove it
          console.log(`Theme symlink points to non-existent theme, removing: ${target}`);
          fs.unlinkSync(symlinkPath);
        }
      } catch (err) {
        console.error('Error reading symlink:', err);
        // Remove invalid symlink
        fs.unlinkSync(symlinkPath);
      }
    } else {
      // Not a symlink, remove it
      console.log('theme path exists but is not a symlink, removing');
      fs.rmSync(symlinkPath, { recursive: true, force: true });
    }
  }

  // Symlink doesn't exist or was removed, create it
  // Read current theme from state
  let currentTheme = 'tokyo-night';
  if (fs.existsSync(statePath)) {
    try {
      const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      if (state.currentTheme) {
        currentTheme = state.currentTheme;
      }
    } catch (err) {
      console.error('Error reading state file:', err);
    }
  }

  // Create symlink to current theme
  const themePath = path.join(getThemesDir(), currentTheme);

  // Verify theme directory exists
  if (!fs.existsSync(themePath)) {
    console.error(`Theme directory not found: ${themePath}`);
    // Try to use tokyo-night as fallback
    const fallbackPath = path.join(getThemesDir(), 'tokyo-night');
    if (fs.existsSync(fallbackPath)) {
      console.log('Using tokyo-night as fallback theme');
      currentTheme = 'tokyo-night';
      // Update state file
      const state = {
        currentTheme: 'tokyo-night',
        lastSwitched: Date.now(),
      };
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
    } else {
      console.error('No themes available, cannot create symlink');
      return;
    }
  }

  // Create the symlink
  try {
    fs.symlinkSync(path.join(getThemesDir(), currentTheme), symlinkPath, 'dir');
    console.log(`Created theme symlink: ${symlinkPath} -> ${path.join(getThemesDir(), currentTheme)}`);
  } catch (err) {
    console.error('Failed to create theme symlink:', err);
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

/**
 * Initialize app after themes are installed
 * This must be called AFTER installBundledThemes() to ensure themes exist
 */
export function initializeAppAfterThemes(): void {
  console.log('Initializing theme symlink...');
  ensureThemeSymlink();
  console.log('Theme symlink initialization complete!');
}
