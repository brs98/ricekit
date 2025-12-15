/**
 * System IPC Handlers
 * Handles system operations, appearance detection, scheduling, and external operations
 */
import { ipcMain, Notification, nativeTheme, shell, BrowserWindow } from 'electron';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import { exec } from 'child_process';
import { getThemesDir } from '../directories';
import { logger } from '../logger';
import { readDir, existsSync, readJson } from '../utils/asyncFs';
import { handleGetPreferences } from './preferencesHandlers';
import { handleGetState } from './stateHandlers';

// Forward declaration - will be set by theme handlers
let applyThemeHandler: ((event: any, name: string) => Promise<void>) | null = null;
let applyWallpaperHandler: ((event: any, path: string) => Promise<void>) | null = null;

/**
 * Set the theme apply handler (called by themeHandlers to avoid circular deps)
 */
export function setThemeApplyHandler(handler: (event: any, name: string) => Promise<void>): void {
  applyThemeHandler = handler;
}

/**
 * Set the wallpaper apply handler (called by wallpaperHandlers to avoid circular deps)
 */
export function setWallpaperApplyHandler(handler: (event: any, path: string) => Promise<void>): void {
  applyWallpaperHandler = handler;
}

/**
 * Get system appearance (light/dark mode)
 */
export async function handleGetSystemAppearance(): Promise<'light' | 'dark'> {
  // Use Electron's nativeTheme to detect system appearance
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
}

/**
 * Open a URL in the default external browser
 */
async function handleOpenExternal(_event: any, url: string): Promise<void> {
  try {
    await shell.openExternal(url);
  } catch (error: any) {
    logger.error('Failed to open external URL:', error);
    throw new Error(`Failed to open URL: ${error.message}`);
  }
}

/**
 * Open a file or folder path in the default application
 */
async function handleOpenPath(_event: any, filePath: string): Promise<void> {
  try {
    // Expand ~ to home directory
    const expandedPath = filePath.replace(/^~/, os.homedir());

    if (!existsSync(expandedPath)) {
      throw new Error(`Path does not exist: ${filePath}`);
    }

    await shell.openPath(expandedPath);
  } catch (error: any) {
    logger.error('Failed to open path:', error);
    throw new Error(`Failed to open path: ${error.message}`);
  }
}

/**
 * Open help documentation in default markdown viewer or browser
 */
async function handleOpenHelp(_event: any): Promise<void> {
  try {
    // Get the app's root directory (in development) or resources path (in production)
    const { app } = await import('electron');
    const isDev = !app.isPackaged;

    let helpFilePath: string;

    if (isDev) {
      // In development, HELP.md is in the project root
      helpFilePath = path.join(app.getAppPath(), 'HELP.md');
    } else {
      // In production, HELP.md would be in the resources folder
      // For now, just use the app path
      helpFilePath = path.join(app.getAppPath(), 'HELP.md');
    }

    // Check if file exists
    if (!existsSync(helpFilePath)) {
      logger.warn('HELP.md not found at:', helpFilePath);
      // Fall back to opening GitHub URL
      await shell.openExternal('https://github.com/yourusername/mactheme#readme');
      return;
    }

    // Open the help file with the default markdown viewer/editor
    await shell.openPath(helpFilePath);

    logger.info('Opened help file:', helpFilePath);
  } catch (error: any) {
    logger.error('Failed to open help:', error);
    throw new Error(`Failed to open help: ${error.message}`);
  }
}

/**
 * Calculate sunrise and sunset times for a given location and date
 * Uses a simplified algorithm based on NOAA calculations
 * Returns times in local timezone
 */
function calculateSunTimes(lat: number, lon: number, date: Date = new Date()): { sunrise: Date; sunset: Date } {
  // Get the day of year
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  // Fractional year in radians
  const gamma = ((2 * Math.PI) / 365) * (dayOfYear - 1);

  // Equation of time in minutes
  const eqtime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));

  // Solar declination angle in radians
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  // Convert latitude to radians
  const lat_rad = (lat * Math.PI) / 180;

  // Hour angle in radians
  const cos_ha =
    Math.cos((90.833 * Math.PI) / 180) / (Math.cos(lat_rad) * Math.cos(decl)) -
    Math.tan(lat_rad) * Math.tan(decl);

  // Check if sun never rises or sets (polar regions)
  if (cos_ha > 1 || cos_ha < -1) {
    const sunrise = new Date(date);
    sunrise.setHours(6, 0, 0, 0);
    const sunset = new Date(date);
    sunset.setHours(18, 0, 0, 0);
    return { sunrise, sunset };
  }

  const ha = Math.acos(cos_ha);

  // Calculate sunrise and sunset times in minutes from midnight UTC
  const sunrise_time = 720 - 4 * (lon + (ha * 180) / Math.PI) - eqtime;
  const sunset_time = 720 - 4 * (lon - (ha * 180) / Math.PI) - eqtime;

  // Get timezone offset in minutes
  const timezoneOffset = date.getTimezoneOffset();

  // Adjust for local timezone
  const sunrise_local = sunrise_time - timezoneOffset;
  const sunset_local = sunset_time - timezoneOffset;

  // Convert to hours and minutes, handling day wraparound
  const sunrise = new Date(date);
  let sunrise_hours = Math.floor(sunrise_local / 60);
  const sunrise_mins = Math.floor(sunrise_local % 60);
  if (sunrise_hours < 0) sunrise_hours += 24;
  if (sunrise_hours >= 24) sunrise_hours -= 24;
  sunrise.setHours(sunrise_hours, sunrise_mins, 0, 0);

  const sunset = new Date(date);
  let sunset_hours = Math.floor(sunset_local / 60);
  const sunset_mins = Math.floor(sunset_local % 60);
  if (sunset_hours < 0) sunset_hours += 24;
  if (sunset_hours >= 24) sunset_hours -= 24;
  sunset.setHours(sunset_hours, sunset_mins, 0, 0);

  return { sunrise, sunset };
}

/**
 * Get user's location using macOS Core Location (via shell command)
 * Returns latitude and longitude
 */
async function getUserLocation(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    // Use CoreLocationCLI if available, otherwise fall back to IP-based geolocation
    // For now, we'll use a simple AppleScript to get timezone and make an educated guess
    // In production, you'd want to use a proper Core Location wrapper

    // Try to get location using whereami if installed
    const execAsync = promisify(exec);
    try {
      const { stdout } = await execAsync('which whereami');
      if (stdout.trim()) {
        const { stdout: locationData } = await execAsync('whereami -f json');
        const location = JSON.parse(locationData);
        return {
          latitude: location.latitude,
          longitude: location.longitude,
        };
      }
    } catch (e) {
      // whereami not installed, fall through to default
    }

    // Default to San Francisco coordinates if we can't get location
    // In a production app, you'd prompt the user or use a better fallback
    logger.warn('Could not determine user location, using San Francisco as default');
    return {
      latitude: 37.7749,
      longitude: -122.4194,
    };
  } catch (error) {
    logger.error('Error getting user location:', error);
    return null;
  }
}

/**
 * Handle getting sunrise/sunset times
 */
async function handleGetSunriseSunset(): Promise<{ sunrise: string; sunset: string; location: string } | null> {
  try {
    const location = await getUserLocation();
    if (!location) {
      return null;
    }

    const times = calculateSunTimes(location.latitude, location.longitude);

    // Format times as HH:MM strings
    // The times are in UTC, so we display them in local time
    const formatTime = (date: Date) => {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    };

    return {
      sunrise: formatTime(times.sunrise),
      sunset: formatTime(times.sunset),
      location: `${location.latitude.toFixed(2)}°, ${location.longitude.toFixed(2)}°`,
    };
  } catch (error) {
    logger.error('Error calculating sunrise/sunset:', error);
    return null;
  }
}

/**
 * Helper function to apply dynamic wallpaper based on system appearance
 * Looks for light.* or dark.* wallpapers in the current theme
 */
async function applyDynamicWallpaper(appearance: 'light' | 'dark', themeName: string): Promise<void> {
  try {
    const themePath = path.join(getThemesDir(), themeName);
    const wallpapersDir = path.join(themePath, 'wallpapers');

    // Check if wallpapers directory exists
    if (!existsSync(wallpapersDir)) {
      logger.info(`No wallpapers directory found for theme: ${themeName}`);
      return;
    }

    // List all files in wallpapers directory
    const files = await readDir(wallpapersDir);

    // Look for appearance-specific wallpapers
    // Naming convention: light.png, light.jpg, light-*.png, dark.png, dark.jpg, dark-*.png
    const appearancePattern = new RegExp(`^${appearance}[\\.\\-]`, 'i');
    const matchingWallpaper = files.find((file) => appearancePattern.test(file));

    if (!matchingWallpaper) {
      logger.info(`No ${appearance} wallpaper found for theme: ${themeName}`);
      return;
    }

    // Apply the wallpaper
    const wallpaperPath = path.join(wallpapersDir, matchingWallpaper);
    logger.info(`Applying dynamic ${appearance} wallpaper: ${wallpaperPath}`);
    if (applyWallpaperHandler) {
      await applyWallpaperHandler(null, wallpaperPath);
    }
  } catch (error) {
    logger.error(`Error applying dynamic wallpaper:`, error);
  }
}

/**
 * Apply theme automatically based on system appearance
 * Called when system appearance changes
 */
export async function handleAppearanceChange(): Promise<void> {
  try {
    // Get current system appearance
    const appearance = await handleGetSystemAppearance();
    logger.info(`System appearance changed to: ${appearance}`);

    // Notify all renderer windows about the appearance change
    // This allows components to react to appearance changes via onAppearanceChange callback
    const allWindows = BrowserWindow.getAllWindows();
    allWindows.forEach((window) => {
      window.webContents.send('system:appearance-changed', appearance);
    });

    // Get preferences to check if auto-switching is enabled
    const prefs = await handleGetPreferences();

    // Check if dynamic wallpaper is enabled (even if auto-switch is off)
    if (prefs.dynamicWallpaper?.enabled) {
      const state = await handleGetState();
      logger.info(`Dynamic wallpaper enabled, applying ${appearance} wallpaper for current theme: ${state.currentTheme}`);
      await applyDynamicWallpaper(appearance, state.currentTheme);
    }

    // Check if auto-switching based on system appearance is enabled
    if (!prefs.autoSwitch?.enabled || prefs.autoSwitch?.mode !== 'system') {
      return;
    }

    // Get the appropriate theme based on appearance
    const themeToApply = appearance === 'dark' ? prefs.defaultDarkTheme : prefs.defaultLightTheme;

    if (!themeToApply) {
      logger.warn(`No default ${appearance} theme configured`);
      return;
    }

    // Get current state to avoid unnecessary theme switches
    const state = await handleGetState();
    if (state.currentTheme === themeToApply) {
      logger.info(`Already using theme: ${themeToApply}`);
      return;
    }

    // Apply the theme
    logger.info(`Auto-switching to ${appearance} theme: ${themeToApply}`);
    if (applyThemeHandler) {
      await applyThemeHandler(null, themeToApply);
    }

    // Apply dynamic wallpaper if enabled
    if (prefs.dynamicWallpaper?.enabled) {
      logger.info(`Dynamic wallpaper enabled, applying ${appearance} wallpaper for theme: ${themeToApply}`);
      await applyDynamicWallpaper(appearance, themeToApply);
    }

    // Show notification if enabled (use onScheduledSwitch for system appearance changes)
    const shouldShowNotification = prefs.notifications?.onScheduledSwitch ?? prefs.showNotifications ?? true;
    if (Notification.isSupported() && shouldShowNotification) {
      const notification = new Notification({
        title: 'Theme Auto-Switched',
        body: `Switched to ${appearance} theme: ${themeToApply}`,
        silent: false,
      });
      notification.show();
    }
  } catch (error) {
    logger.error('Error handling appearance change:', error);
  }
}

/**
 * Check schedule and apply theme if needed
 * Called periodically to check if theme should switch based on schedule
 */
export async function checkScheduleAndApplyTheme(): Promise<void> {
  try {
    // Get preferences to check if schedule-based auto-switching is enabled
    const prefs = await handleGetPreferences();

    // Check if auto-switching based on schedule is enabled
    if (!prefs.autoSwitch?.enabled || prefs.autoSwitch?.mode !== 'schedule') {
      return;
    }

    // Check if schedule is configured
    if (!prefs.schedule?.light || !prefs.schedule?.dark) {
      logger.warn('Schedule times not configured');
      return;
    }

    // Get current time
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    // Parse schedule times (format: "HH:MM")
    const lightTimeParts = prefs.schedule.light.split(':');
    const lightTimeMinutes = parseInt(lightTimeParts[0]) * 60 + parseInt(lightTimeParts[1]);

    const darkTimeParts = prefs.schedule.dark.split(':');
    const darkTimeMinutes = parseInt(darkTimeParts[0]) * 60 + parseInt(darkTimeParts[1]);

    // Determine which theme should be active based on current time
    let shouldUseDarkTheme: boolean;

    if (lightTimeMinutes < darkTimeMinutes) {
      // Normal case: light time is in the morning, dark time is in the evening
      // Example: light at 06:00, dark at 18:00
      shouldUseDarkTheme = currentTimeMinutes >= darkTimeMinutes || currentTimeMinutes < lightTimeMinutes;
    } else {
      // Inverted case: light time is after dark time (crossing midnight)
      // Example: light at 18:00, dark at 06:00
      shouldUseDarkTheme = currentTimeMinutes >= darkTimeMinutes && currentTimeMinutes < lightTimeMinutes;
    }

    // Get the appropriate theme
    const themeToApply = shouldUseDarkTheme ? prefs.defaultDarkTheme : prefs.defaultLightTheme;

    if (!themeToApply) {
      logger.warn(`No default ${shouldUseDarkTheme ? 'dark' : 'light'} theme configured`);
      return;
    }

    // Get current state to avoid unnecessary theme switches
    const state = await handleGetState();
    if (state.currentTheme === themeToApply) {
      // Already using the correct theme
      return;
    }

    // Apply the theme
    logger.info(`Schedule-based auto-switching to ${shouldUseDarkTheme ? 'dark' : 'light'} theme: ${themeToApply}`);
    if (applyThemeHandler) {
      await applyThemeHandler(null, themeToApply);
    }

    // Show notification if enabled
    const shouldShowNotification = prefs.notifications?.onScheduledSwitch ?? prefs.showNotifications ?? true;
    if (Notification.isSupported() && shouldShowNotification) {
      const notification = new Notification({
        title: 'Theme Auto-Switched',
        body: `Scheduled switch to ${themeToApply}`,
        silent: false,
      });
      notification.show();
    }
  } catch (error) {
    logger.error('Error checking schedule:', error);
  }
}

/**
 * Check for application updates
 */
async function handleCheckForUpdates(): Promise<{
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  updateUrl?: string;
  error?: string;
}> {
  try {
    // Get current version from package.json
    const packageJsonPath = path.join(__dirname, '../../../package.json');
    let currentVersion = '0.1.0';

    try {
      const packageJson = await readJson<{ version: string }>(packageJsonPath);
      currentVersion = packageJson.version;
    } catch (err) {
      logger.error('Failed to read current version', err);
    }

    logger.info(`Checking for updates. Current version: ${currentVersion}`);

    // For now, simulate checking for updates
    // In a real implementation, this would:
    // 1. Fetch latest release from GitHub API
    // 2. Compare versions using semver
    // 3. Return update information

    // Simulated response - always return "up to date"
    return {
      currentVersion,
      latestVersion: currentVersion,
      hasUpdate: false,
      updateUrl: 'https://github.com/mactheme/mactheme/releases',
    };
  } catch (error) {
    logger.error('Error checking for updates', error);
    return {
      currentVersion: '0.1.0',
      latestVersion: '0.1.0',
      hasUpdate: false,
      error: 'Failed to check for updates: ' + (error as Error).message,
    };
  }
}

/**
 * Wallpaper Scheduler Service
 * Automatically applies wallpapers based on time of day schedules
 */
let wallpaperSchedulerInterval: NodeJS.Timeout | null = null;

/**
 * Start the wallpaper scheduler
 */
export function startWallpaperScheduler(): void {
  // Clear existing interval if any
  if (wallpaperSchedulerInterval) {
    clearInterval(wallpaperSchedulerInterval);
  }

  // Check every minute
  wallpaperSchedulerInterval = setInterval(async () => {
    try {
      await checkAndApplyScheduledWallpaper();
    } catch (error) {
      logger.error('Error in wallpaper scheduler', error);
    }
  }, 60000); // 60000ms = 1 minute

  // Run immediately on start
  checkAndApplyScheduledWallpaper().catch((error) => {
    logger.error('Error in initial wallpaper scheduler check', error);
  });

  logger.info('Wallpaper scheduler started');
}

/**
 * Stop the wallpaper scheduler
 */
export function stopWallpaperScheduler(): void {
  if (wallpaperSchedulerInterval) {
    clearInterval(wallpaperSchedulerInterval);
    wallpaperSchedulerInterval = null;
    logger.info('Wallpaper scheduler stopped');
  }
}

/**
 * Check if a wallpaper should be applied based on current time and schedules
 */
async function checkAndApplyScheduledWallpaper(): Promise<void> {
  try {
    // Get preferences
    const prefs = await handleGetPreferences();

    // Check if wallpaper scheduling is enabled
    if (!prefs.wallpaperSchedule?.enabled || !prefs.wallpaperSchedule.schedules.length) {
      return;
    }

    // Get current time in HH:MM format
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    logger.debug(`Checking wallpaper schedule at ${currentTime}`);

    // Find the active schedule for current time
    for (const schedule of prefs.wallpaperSchedule.schedules) {
      if (isTimeInRange(currentTime, schedule.timeStart, schedule.timeEnd)) {
        // Check if this wallpaper is already applied
        const state = await handleGetState();
        if (state.currentWallpaper === schedule.wallpaperPath) {
          logger.debug(`Scheduled wallpaper already applied: ${schedule.wallpaperPath}`);
          return;
        }

        // Apply the scheduled wallpaper
        logger.info(`Applying scheduled wallpaper: ${schedule.wallpaperPath} (${schedule.name || 'Unnamed'})`);
        if (applyWallpaperHandler) {
          await applyWallpaperHandler(null, schedule.wallpaperPath);
        }

        // Show notification if enabled
        if (prefs.notifications?.onScheduledSwitch) {
          const notification = new Notification({
            title: 'Scheduled Wallpaper Applied',
            body: `Applied ${schedule.name || 'wallpaper'} for ${schedule.timeStart} - ${schedule.timeEnd}`,
          });
          notification.show();
        }

        return; // Exit after applying the first matching schedule
      }
    }

    logger.debug('No matching wallpaper schedule found for current time');
  } catch (error) {
    logger.error('Error checking scheduled wallpaper', error);
  }
}

/**
 * Check if current time is within a time range
 * Supports ranges that cross midnight (e.g., 22:00 - 06:00)
 */
function isTimeInRange(currentTime: string, startTime: string, endTime: string): boolean {
  const toMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const current = toMinutes(currentTime);
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);

  if (start <= end) {
    // Normal range (e.g., 06:00 - 18:00)
    return current >= start && current < end;
  } else {
    // Range crosses midnight (e.g., 22:00 - 06:00)
    return current >= start || current < end;
  }
}

/**
 * Register system IPC handlers
 */
export function registerSystemHandlers(): void {
  ipcMain.handle('system:appearance', handleGetSystemAppearance);
  ipcMain.handle('system:getSunriseSunset', handleGetSunriseSunset);
  ipcMain.handle('system:openExternal', handleOpenExternal);
  ipcMain.handle('system:openPath', handleOpenPath);
  ipcMain.handle('system:openHelp', handleOpenHelp);
  ipcMain.handle('system:checkForUpdates', handleCheckForUpdates);
}
