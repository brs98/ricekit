import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import { logger } from './logger';
import { getErrorMessage } from '../shared/errors';
import { typedKeys } from '../shared/types';

/**
 * Type guard for Record<string, unknown> - validates parsed JSON is an object
 */
function isPlainObject(data: unknown): data is Record<string, unknown> {
  return typeof data === 'object' && data !== null && !Array.isArray(data);
}

/**
 * Get the Flowstate application data directory
 */
export function getAppDataDir(): string {
  return path.join(app.getPath('appData'), 'Flowstate');
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
 * Get path to presets directory
 */
export function getPresetsDir(): string {
  return path.join(getAppDataDir(), 'presets');
}

/**
 * Get path to current presets symlink directory
 */
export function getCurrentPresetsDir(): string {
  return path.join(getCurrentDir(), 'presets');
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
 * Create all required directories for Flowstate
 */
export function ensureDirectories(): void {
  const dirs = [
    getAppDataDir(),
    getThemesDir(),
    getCustomThemesDir(),
    getCurrentDir(),
    getPresetsDir(),
    getCurrentPresetsDir(),
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`Created directory: ${dir}`);
    }
  }
}

/**
 * Get default preferences object
 */
export function getDefaultPreferences(): import('../shared/types').Preferences {
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
    dynamicWallpaper: {
      enabled: false,
    },
    schedule: {
      enabled: false,
      schedules: [],
    },
    pluginConfigs: {},
  };
}

/**
 * Migrate old preferences format to new unified schedule format
 */
function migratePreferences(prefs: Record<string, unknown>): { migrated: Record<string, unknown>; didMigrate: boolean } {
  let didMigrate = false;
  const migrated = { ...prefs };

  // Migrate wallpaperSchedule to new schedule format
  if ('wallpaperSchedule' in migrated && migrated.wallpaperSchedule) {
    const oldSchedule = migrated.wallpaperSchedule as {
      enabled: boolean;
      schedules: Array<{
        timeStart: string;
        timeEnd: string;
        wallpaperPath: string;
        name?: string;
      }>;
    };

    // Only migrate if new schedule doesn't exist or is empty
    if (!migrated.schedule || !(migrated.schedule as { schedules?: unknown[] }).schedules?.length) {
      migrated.schedule = {
        enabled: oldSchedule.enabled,
        schedules: oldSchedule.schedules.map(s => ({
          timeStart: s.timeStart,
          timeEnd: s.timeEnd,
          name: s.name,
          type: 'wallpaper' as const,
          wallpaperPath: s.wallpaperPath,
        })),
      };
      logger.info('Migrated wallpaperSchedule to new schedule format');
    }

    delete migrated.wallpaperSchedule;
    didMigrate = true;
  }

  // Remove deprecated fields
  const deprecatedFields = ['autoSwitch', 'defaultLightTheme', 'defaultDarkTheme'];
  for (const field of deprecatedFields) {
    if (field in migrated) {
      delete migrated[field];
      didMigrate = true;
      logger.info(`Removed deprecated preference field: ${field}`);
    }
  }

  // Remove old schedule format (light/dark times)
  if (migrated.schedule && 'light' in (migrated.schedule as Record<string, unknown>)) {
    // This is the old schedule format, replace with default
    migrated.schedule = {
      enabled: false,
      schedules: [],
    };
    didMigrate = true;
    logger.info('Replaced old schedule format with new unified format');
  }

  return { migrated, didMigrate };
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
    logger.info(`Created preferences file: ${prefsPath}`);
    return;
  }

  // If file exists, validate it's valid JSON and merge with defaults
  try {
    const content = fs.readFileSync(prefsPath, 'utf-8');
    const parsed: unknown = JSON.parse(content);

    if (!isPlainObject(parsed)) {
      throw new Error('Preferences file does not contain a valid JSON object');
    }
    const existingPrefs = parsed;

    // Run migrations first
    const { migrated: migratedPrefs, didMigrate } = migratePreferences(existingPrefs);

    // Merge existing preferences with defaults to add any missing fields
    const mergedPrefs = { ...defaultPreferences, ...migratedPrefs };

    // Check if any new fields were added
    const hasNewFields = typedKeys(defaultPreferences).some(
      key => !(key in migratedPrefs)
    );

    // If new fields were added or migration occurred, update the file
    if (hasNewFields || didMigrate) {
      fs.writeFileSync(prefsPath, JSON.stringify(mergedPrefs, null, 2));
      logger.info(`Updated preferences file: ${prefsPath}`);
    }
  } catch (error: unknown) {
    // File exists but contains invalid JSON - log error and recreate with defaults
    logger.error(`Corrupted preferences file detected: ${prefsPath}`);
    logger.error(`Error: ${error instanceof Error ? error.message : String(error)}`);

    // Backup the corrupted file
    try {
      const backupPath = `${prefsPath}.corrupted.${Date.now()}.backup`;
      fs.copyFileSync(prefsPath, backupPath);
      logger.info(`Backed up corrupted file to: ${backupPath}`);
    } catch (backupError: unknown) {
      logger.error('Failed to backup corrupted file:', getErrorMessage(backupError));
    }

    // Replace with default preferences
    fs.writeFileSync(prefsPath, JSON.stringify(defaultPreferences, null, 2));
    logger.info(`Replaced corrupted preferences with defaults: ${prefsPath}`);
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
    logger.info(`Created state file: ${statePath}`);
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
          logger.info(`Theme symlink already exists: ${symlinkPath} -> ${target}`);
          return;
        } else {
          // Symlink points to non-existent theme, remove it
          logger.info(`Theme symlink points to non-existent theme, removing: ${target}`);
          fs.unlinkSync(symlinkPath);
        }
      } catch (err: unknown) {
        logger.error('Error reading symlink:', getErrorMessage(err));
        // Remove invalid symlink
        fs.unlinkSync(symlinkPath);
      }
    } else {
      // Not a symlink, remove it
      logger.info('theme path exists but is not a symlink, removing');
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
    } catch (err: unknown) {
      logger.error('Error reading state file:', getErrorMessage(err));
    }
  }

  // Create symlink to current theme
  const themePath = path.join(getThemesDir(), currentTheme);

  // Verify theme directory exists
  if (!fs.existsSync(themePath)) {
    logger.error(`Theme directory not found: ${themePath}`);
    // Try to use tokyo-night as fallback
    const fallbackPath = path.join(getThemesDir(), 'tokyo-night');
    if (fs.existsSync(fallbackPath)) {
      logger.info('Using tokyo-night as fallback theme');
      currentTheme = 'tokyo-night';
      // Update state file
      const state = {
        currentTheme: 'tokyo-night',
        lastSwitched: Date.now(),
      };
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
    } else {
      logger.error('No themes available, cannot create symlink');
      return;
    }
  }

  // Create the symlink
  try {
    fs.symlinkSync(path.join(getThemesDir(), currentTheme), symlinkPath, 'dir');
    logger.info(`Created theme symlink: ${symlinkPath} -> ${path.join(getThemesDir(), currentTheme)}`);
  } catch (err: unknown) {
    logger.error('Failed to create theme symlink:', getErrorMessage(err));
  }
}

/**
 * Initialize all Flowstate directories and files
 */
export function initializeApp(): void {
  logger.info('Initializing Flowstate application directories...');
  ensureDirectories();
  ensurePreferences();
  ensureState();
  logger.info('Flowstate initialization complete!');
}

/**
 * Initialize app after themes are installed
 * This must be called AFTER installBundledThemes() to ensure themes exist
 */
export function initializeAppAfterThemes(): void {
  logger.info('Initializing theme symlink...');
  ensureThemeSymlink();
  logger.info('Theme symlink initialization complete!');
}
