/**
 * Theme application operations
 *
 * Core logic for applying themes - symlinks, state updates, and terminal notifications.
 * Works in both Electron and CLI contexts.
 */

import path from 'path';
import os from 'os';
import { exec, execSync } from 'child_process';
import type { ThemeColors, ThemeMetadata, State, Preferences } from '../../shared/types';
import {
  existsSync,
  readJson,
  writeJson,
  isSymlink,
  isDirectory,
  unlink,
  rmdir,
  createSymlink,
  copyFile,
  isExecutable,
} from '../utils/fs';
import { getPathProvider } from '../paths';
import { getTheme } from './list';
import { listWallpapers, applyWallpaper } from '../wallpaper';
import type { Result } from '../interfaces';
import { ok, err } from '../interfaces';

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
 * Notify Kitty terminal to reload colors
 */
async function notifyKitty(themeColors: ThemeColors, onLog?: (msg: string) => void): Promise<boolean> {
  const colorArgs: string[] = [];

  // Map theme colors to Kitty color names
  if (themeColors.background) colorArgs.push(`background=${themeColors.background}`);
  if (themeColors.foreground) colorArgs.push(`foreground=${themeColors.foreground}`);
  if (themeColors.cursor) colorArgs.push(`cursor=${themeColors.cursor}`);
  if (themeColors.selection) colorArgs.push(`selection_background=${themeColors.selection}`);

  // ANSI colors
  if (themeColors.black) colorArgs.push(`color0=${themeColors.black}`);
  if (themeColors.red) colorArgs.push(`color1=${themeColors.red}`);
  if (themeColors.green) colorArgs.push(`color2=${themeColors.green}`);
  if (themeColors.yellow) colorArgs.push(`color3=${themeColors.yellow}`);
  if (themeColors.blue) colorArgs.push(`color4=${themeColors.blue}`);
  if (themeColors.magenta) colorArgs.push(`color5=${themeColors.magenta}`);
  if (themeColors.cyan) colorArgs.push(`color6=${themeColors.cyan}`);
  if (themeColors.white) colorArgs.push(`color7=${themeColors.white}`);

  // Bright colors
  if (themeColors.brightBlack) colorArgs.push(`color8=${themeColors.brightBlack}`);
  if (themeColors.brightRed) colorArgs.push(`color9=${themeColors.brightRed}`);
  if (themeColors.brightGreen) colorArgs.push(`color10=${themeColors.brightGreen}`);
  if (themeColors.brightYellow) colorArgs.push(`color11=${themeColors.brightYellow}`);
  if (themeColors.brightBlue) colorArgs.push(`color12=${themeColors.brightBlue}`);
  if (themeColors.brightMagenta) colorArgs.push(`color13=${themeColors.brightMagenta}`);
  if (themeColors.brightCyan) colorArgs.push(`color14=${themeColors.brightCyan}`);
  if (themeColors.brightWhite) colorArgs.push(`color15=${themeColors.brightWhite}`);

  if (colorArgs.length === 0) return false;

  return new Promise((resolve) => {
    const kittyCommand = `kitty @ set-colors ${colorArgs.join(' ')}`;
    exec(kittyCommand, (error) => {
      if (error) {
        onLog?.('Kitty not available or remote control disabled');
        resolve(false);
      } else {
        onLog?.('✓ Kitty terminal reloaded');
        resolve(true);
      }
    });
  });
}

/**
 * Notify WezTerm by updating the theme file
 */
async function notifyWezTerm(themePath: string, onLog?: (msg: string) => void): Promise<boolean> {
  try {
    const weztermThemeSrc = path.join(themePath, 'wezterm.lua');
    const weztermThemeDest = path.join(
      os.homedir(),
      'Library',
      'Application Support',
      'Flowstate',
      'wezterm-colors.lua'
    );

    if (existsSync(weztermThemeSrc)) {
      await copyFile(weztermThemeSrc, weztermThemeDest);
      onLog?.('✓ WezTerm theme file updated');
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Reload SketchyBar
 */
async function notifySketchyBar(onLog?: (msg: string) => void): Promise<boolean> {
  const sketchybarPaths = ['/opt/homebrew/bin/sketchybar', '/usr/local/bin/sketchybar'];
  const sketchybarBin = sketchybarPaths.find((p) => existsSync(p));

  if (!sketchybarBin) {
    return false;
  }

  // Check if SketchyBar is running
  let sketchybarRunning = false;
  try {
    execSync('pgrep -x sketchybar', { stdio: 'pipe' });
    sketchybarRunning = true;
  } catch {
    // Not running
  }

  if (!sketchybarRunning) {
    return false;
  }

  try {
    execSync(`"${sketchybarBin}" --reload`, {
      stdio: 'pipe',
      timeout: 5000,
    });
    onLog?.('✓ SketchyBar reloaded');
    return true;
  } catch {
    return false;
  }
}

/**
 * Apply AeroSpace/JankyBorders theme
 */
async function notifyAeroSpace(themePath: string, onLog?: (msg: string) => void): Promise<boolean> {
  try {
    const bordersScript = path.join(themePath, 'aerospace-borders.sh');
    if (existsSync(bordersScript)) {
      execSync(`bash "${bordersScript}"`, {
        shell: '/bin/bash',
        stdio: 'pipe',
        timeout: 5000,
      });
      onLog?.('✓ AeroSpace/JankyBorders theme applied');
      return true;
    }
    return false;
  } catch {
    return false;
  }
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
    exec(`"${expandedPath}" "${themeName}"`, (error, stdout, stderr) => {
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
 * Empty enabledApps means no apps are enabled (explicit opt-in required)
 */
function isAppEnabled(prefs: Preferences | null, appName: string): boolean {
  return prefs?.enabledApps?.includes(appName) ?? false;
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

  // Read theme colors
  let themeColors: ThemeColors | null = null;
  try {
    const themeJsonPath = path.join(themePath, 'theme.json');
    const themeData = await readJson<ThemeMetadata>(themeJsonPath);
    themeColors = themeData.colors;
  } catch {
    // Continue without colors
  }

  // Read preferences for enabled apps and hook script
  const paths = getPathProvider();
  let prefs: Preferences | null = null;
  try {
    prefs = await readJson<Preferences>(paths.getPreferencesPath());
  } catch {
    // Continue with defaults
  }

  // Notify Kitty (only if enabled)
  if (isAppEnabled(prefs, 'kitty')) {
    if (themeColors && existsSync(path.join(themePath, 'kitty.conf'))) {
      if (await notifyKitty(themeColors, onLog)) {
        notifiedApps.push('kitty');
      }
    }
  }

  // Notify WezTerm (only if enabled)
  if (isAppEnabled(prefs, 'wezterm')) {
    if (await notifyWezTerm(themePath, onLog)) {
      notifiedApps.push('wezterm');
    }
  }

  // Small delay for symlink to be visible
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Reload SketchyBar (only if enabled)
  if (isAppEnabled(prefs, 'sketchybar')) {
    if (await notifySketchyBar(onLog)) {
      notifiedApps.push('sketchybar');
    }
  }

  // Apply AeroSpace/JankyBorders (only if enabled)
  if (isAppEnabled(prefs, 'aerospace')) {
    if (await notifyAeroSpace(themePath, onLog)) {
      notifiedApps.push('aerospace');
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
      return err(new Error(`Theme "${themeName}" not found`));
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
