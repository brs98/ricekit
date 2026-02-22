/**
 * Theme application operations
 *
 * Core logic for applying themes - symlinks, state updates, and terminal notifications.
 * Works in both Electron and CLI contexts.
 */

import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import type { State, Preferences } from '../../shared/types';
import {
  existsSync,
  readJson,
  writeJson,
  isSymlink,
  isDirectory,
  unlink,
  rmdir,
  createSymlink,
  isExecutable,
} from '../utils/fs';
import { getPathProvider } from '../paths';
import { getTheme } from './list';
import { listWallpapers, applyWallpaper } from '../wallpaper';
import type { Result } from '../interfaces';
import { ok, err } from '../interfaces';
import { createErrorWithHint } from '../../shared/errors';
import { getAdaptersWithNotify } from '../apps/registry';

// Ensure all adapters are registered
import '../apps/adapters';

/**
 * Options for theme application
 */
export interface ApplyThemeOptions {
  /** Skip terminal reload notifications */
  skipNotify?: boolean;
  /** Called from scheduler (won't disable scheduling) */
  fromScheduler?: boolean;
  /** Skip wallpaper application */
  skipWallpaper?: boolean;
  /** Callback for logging */
  onLog?: (message: string) => void;
}

/**
 * Result of theme application
 */
export interface ApplyThemeResult {
  previousTheme: string | null;
  currentTheme: string;
  notifiedApps: string[];
}

/**
 * Execute user-defined hook script
 */
async function executeHookScript(
  themeName: string,
  hookScriptPath: string,
  onLog?: (msg: string) => void
): Promise<boolean> {
  // Expand ~ to home directory
  const expandedPath = hookScriptPath.startsWith('~')
    ? path.join(os.homedir(), hookScriptPath.slice(1))
    : hookScriptPath;

  if (!existsSync(expandedPath)) {
    onLog?.(`Hook script not found: ${expandedPath}`);
    return false;
  }

  if (!(await isExecutable(expandedPath))) {
    onLog?.(`Hook script not executable: ${expandedPath}`);
    return false;
  }

  return new Promise((resolve) => {
    exec(`"${expandedPath}" "${themeName}"`, (error, stdout, _stderr) => {
      if (error) {
        onLog?.(`Hook script failed: ${error.message}`);
        resolve(false);
        return;
      }

      if (stdout) {
        onLog?.(`Hook: ${stdout.trim()}`);
      }

      onLog?.('✓ Hook script executed');
      resolve(true);
    });
  });
}

/**
 * Check if an app is enabled for auto-refresh
 * Empty enabledApps means all apps are enabled (matches UI default)
 */
function isAppEnabled(prefs: Preferences | null, appName: string): boolean {
  if (!prefs?.enabledApps || prefs.enabledApps.length === 0) {
    return true;
  }
  return prefs.enabledApps.includes(appName);
}

/**
 * Notify terminals and apps to reload themes
 */
export async function notifyApps(
  themePath: string,
  themeName: string,
  options?: ApplyThemeOptions
): Promise<string[]> {
  const notifiedApps: string[] = [];
  const onLog = options?.onLog;

  // Read preferences for enabled apps and hook script
  const paths = getPathProvider();
  let prefs: Preferences | null = null;
  try {
    prefs = await readJson<Preferences>(paths.getPreferencesPath());
  } catch {
    // Continue with defaults
  }

  // Iterate adapters with notify() method
  const adapters = getAdaptersWithNotify();
  let isFirst = true;

  for (const adapter of adapters) {
    if (!isAppEnabled(prefs, adapter.name)) continue;

    if (await adapter.notify!(themePath, onLog)) {
      notifiedApps.push(adapter.name);
    }

    // Small delay after first notification for symlink visibility
    if (isFirst) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      isFirst = false;
    }
  }

  // Execute hook script (always runs if configured, not dependent on enabledApps)
  if (prefs?.hookScript && prefs.hookScript.trim() !== '') {
    if (await executeHookScript(themeName, prefs.hookScript, onLog)) {
      notifiedApps.push('hook');
    }
  }

  return notifiedApps;
}

/**
 * Apply a theme
 *
 * Core operation that:
 * 1. Creates/updates symlink to theme
 * 2. Updates state file
 * 3. Updates recent themes in preferences
 * 4. Optionally notifies terminals to reload
 */
export async function applyTheme(
  themeName: string,
  options?: ApplyThemeOptions
): Promise<Result<ApplyThemeResult, Error>> {
  const onLog = options?.onLog;
  const paths = getPathProvider();

  try {
    // Find the theme
    const theme = await getTheme(themeName);
    if (!theme) {
      return err(createErrorWithHint(
        'THEME_NOT_FOUND',
        `Theme "${themeName}" not found`,
        `Run 'ricekit theme list' to see available themes.`
      ));
    }

    // Get previous theme
    let previousTheme: string | null = null;
    const statePath = paths.getStatePath();
    if (existsSync(statePath)) {
      try {
        const state = await readJson<State>(statePath);
        previousTheme = state.currentTheme || null;
      } catch {
        // Ignore
      }
    }

    // Create or update symlink
    const currentDir = paths.getCurrentDir();
    const symlinkPath = path.join(currentDir, 'theme');

    // Remove existing symlink if it exists
    if (existsSync(symlinkPath)) {
      if (await isSymlink(symlinkPath)) {
        await unlink(symlinkPath);
      } else if (await isDirectory(symlinkPath)) {
        await rmdir(symlinkPath);
      }
    }

    // Create new symlink
    await createSymlink(theme.path, symlinkPath, 'dir');
    onLog?.(`Created symlink: ${symlinkPath} -> ${theme.path}`);

    // Update state
    const state: State = {
      currentTheme: themeName,
      lastSwitched: Date.now(),
    };
    await writeJson(statePath, state);

    // Update recent themes in preferences
    try {
      const prefsPath = paths.getPreferencesPath();
      if (existsSync(prefsPath)) {
        const prefs = await readJson<Preferences>(prefsPath);
        if (!prefs.recentThemes) {
          prefs.recentThemes = [];
        }
        prefs.recentThemes = prefs.recentThemes.filter((t) => t !== themeName);
        prefs.recentThemes.unshift(themeName);
        if (prefs.recentThemes.length > 10) {
          prefs.recentThemes = prefs.recentThemes.slice(0, 10);
        }

        // Disable scheduling if manual apply
        if (!options?.fromScheduler && prefs.schedule?.enabled) {
          prefs.schedule.enabled = false;
          onLog?.('Disabled scheduling (manual theme apply)');
        }

        await writeJson(prefsPath, prefs);
      }
    } catch {
      // Non-critical, continue
    }

    // Notify terminals
    let notifiedApps: string[] = [];
    if (!options?.skipNotify) {
      notifiedApps = await notifyApps(theme.path, themeName, options);
    }

    // Apply the first wallpaper from the theme (unless skipped)
    if (!options?.skipWallpaper) {
      try {
        const wallpapers = await listWallpapers(themeName);
        const firstWallpaper = wallpapers[0];
        if (firstWallpaper) {
          onLog?.(`Applying wallpaper: ${path.basename(firstWallpaper)}`);
          await applyWallpaper(firstWallpaper);
          notifiedApps.push('wallpaper');
        }
      } catch (wpError: unknown) {
        onLog?.(`Warning: Could not apply wallpaper: ${wpError instanceof Error ? wpError.message : String(wpError)}`);
        // Don't fail theme application if wallpaper fails
      }
    }

    onLog?.(`Theme "${themeName}" applied successfully`);

    return ok({
      previousTheme,
      currentTheme: themeName,
      notifiedApps,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return err(new Error(`Failed to apply theme: ${message}`));
  }
}
