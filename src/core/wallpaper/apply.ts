/**
 * Wallpaper application strategies
 *
 * Dual-strategy approach for reliable wallpaper application:
 * 1. desktoppr (NSWorkspace API) — reliable multi-monitor support
 * 2. AppleScript (System Events) — best available approach for all Spaces
 *
 * Both run on every apply. Throws only if both fail.
 */

import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { existsSync } from '../utils/fs';

const execFileAsync = promisify(execFile);

export interface ApplyWallpaperOptions {
  /** 1-based display index. Omit to apply to all displays. */
  displayIndex?: number;
  /** Explicit path to desktoppr binary (overrides search). */
  desktopprPath?: string;
  /** Optional logging callback (keeps core/ free of logger dependencies). */
  onLog?: (level: 'info' | 'warn' | 'error', message: string) => void;
}

/**
 * Apply wallpaper to desktops using both desktoppr and AppleScript.
 * Either strategy succeeding is sufficient. Throws only if both fail.
 */
export async function applyWallpaperToDesktops(
  wallpaperPath: string,
  options: ApplyWallpaperOptions = {}
): Promise<void> {
  const { displayIndex, desktopprPath, onLog } = options;
  const log = onLog ?? (() => {});

  const errors: string[] = [];

  // Strategy 1: desktoppr (multi-monitor)
  const desktopprBin = findDesktoppr(desktopprPath);
  if (desktopprBin) {
    try {
      await applyViaDesktoppr(desktopprBin, wallpaperPath, displayIndex);
      log('info', 'desktoppr applied wallpaper successfully');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`desktoppr: ${msg}`);
      log('warn', `desktoppr failed: ${msg}`);
    }
  } else {
    log('info', 'desktoppr not found, skipping');
  }

  // Strategy 2: AppleScript (all Spaces)
  try {
    await applyViaAppleScript(wallpaperPath, displayIndex);
    log('info', 'AppleScript applied wallpaper successfully');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`AppleScript: ${msg}`);
    log('warn', `AppleScript failed: ${msg}`);
  }

  // If both strategies failed, throw
  if (errors.length === 2 || (errors.length === 1 && !desktopprBin)) {
    throw new Error(`Failed to apply wallpaper: ${errors.join('; ')}`);
  }
}

/**
 * Locate the desktoppr binary.
 *
 * Search order:
 * 1. Explicit path (from options)
 * 2. Electron production: process.resourcesPath/bin/desktoppr
 * 3. Development: resources/bin/desktoppr (relative to project root)
 * 4. System installs: /usr/local/bin, /opt/homebrew/bin
 */
export function findDesktoppr(explicitPath?: string): string | null {
  if (explicitPath && existsSync(explicitPath)) {
    return explicitPath;
  }

  const candidates: string[] = [];

  // Electron production path
  const resourcesPath = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath;
  if (resourcesPath) {
    candidates.push(path.join(resourcesPath, 'bin', 'desktoppr'));
  }

  // Development paths — walk up from __dirname to find project root
  // __dirname is dist/core/wallpaper (CLI) or dist/main/core/wallpaper (Electron)
  candidates.push(path.join(__dirname, '..', '..', '..', 'resources', 'bin', 'desktoppr'));
  candidates.push(path.join(__dirname, '..', '..', '..', '..', 'resources', 'bin', 'desktoppr'));

  // System-wide installs
  candidates.push('/usr/local/bin/desktoppr');
  candidates.push('/opt/homebrew/bin/desktoppr');

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Apply wallpaper using desktoppr binary (NSWorkspace API).
 * Uses execFile (no shell) so paths with special characters are safe.
 *
 * Note: desktoppr uses 0-based screen indices while the public API uses
 * 1-based (matching AppleScript's `desktop N`), so we subtract 1.
 */
async function applyViaDesktoppr(
  binPath: string,
  wallpaperPath: string,
  displayIndex?: number
): Promise<void> {
  const args =
    displayIndex !== undefined && displayIndex !== null
      ? [String(displayIndex - 1), wallpaperPath]
      : [wallpaperPath];

  await execFileAsync(binPath, args);
}

/**
 * Apply wallpaper using AppleScript (System Events).
 * Uses execFile with osascript -e (no shell) for safe argument passing.
 */
async function applyViaAppleScript(
  wallpaperPath: string,
  displayIndex?: number
): Promise<void> {
  // Escape backslashes and double quotes for the AppleScript string literal
  const escapedForAS = wallpaperPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  const script =
    displayIndex !== undefined && displayIndex !== null
      ? `tell application "System Events" to set picture of desktop ${displayIndex} to "${escapedForAS}"`
      : `tell application "System Events" to tell every desktop to set picture to "${escapedForAS}"`;

  await execFileAsync('/usr/bin/osascript', ['-e', script]);
}
