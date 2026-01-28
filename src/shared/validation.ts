/**
 * Runtime validation utilities for type-safe data handling
 *
 * These utilities provide type guards and validators for common patterns
 * like JSON parsing, form input validation, and dictionary access.
 */

import type { Preferences, State, ThemeMetadata, UIState, PluginConfig, SortMode } from './types';

// Valid sort mode values
const SORT_MODES = ['default', 'name-asc', 'name-desc', 'recent'] as const;

/**
 * Type guard for SortMode
 */
export function isSortMode(value: string): value is SortMode {
  return (SORT_MODES as readonly string[]).includes(value);
}

/**
 * Type guard for Preferences object structure
 * Validates the essential fields exist with correct types
 */
export function isPreferences(data: unknown): data is Preferences {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;

  // Required arrays
  if (!Array.isArray(obj.enabledApps)) return false;
  if (!Array.isArray(obj.favorites)) return false;
  if (!Array.isArray(obj.recentThemes)) return false;

  // Required booleans
  if (typeof obj.startAtLogin !== 'boolean') return false;
  if (typeof obj.showInMenuBar !== 'boolean') return false;
  if (typeof obj.onboardingCompleted !== 'boolean') return false;

  // Required nested object
  if (typeof obj.keyboardShortcuts !== 'object' || obj.keyboardShortcuts === null) return false;
  if (typeof obj.notifications !== 'object' || obj.notifications === null) return false;

  return true;
}

/**
 * Type guard for State object structure
 */
export function isState(data: unknown): data is State {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;

  if (typeof obj.currentTheme !== 'string') return false;
  if (typeof obj.lastSwitched !== 'number') return false;

  return true;
}

/**
 * Type guard for UIState object structure
 */
export function isUIState(data: unknown): data is UIState {
  if (typeof data !== 'object' || data === null) return false;
  // UIState has all optional fields, so any object is valid
  return true;
}

/**
 * Type guard for ThemeMetadata object structure
 */
export function isThemeMetadata(data: unknown): data is ThemeMetadata {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;

  if (typeof obj.name !== 'string') return false;
  if (typeof obj.author !== 'string') return false;
  if (typeof obj.description !== 'string') return false;
  if (typeof obj.version !== 'string') return false;

  // Colors object is required
  if (typeof obj.colors !== 'object' || obj.colors === null) return false;

  return true;
}

/**
 * Type guard for PluginConfig object structure
 */
export function isPluginConfig(data: unknown): data is PluginConfig {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;

  if (obj.mode !== 'preset' && obj.mode !== 'custom') return false;
  if (obj.installedBy !== 'flowstate' && obj.installedBy !== 'user' && obj.installedBy !== 'unknown') return false;

  return true;
}

/**
 * Type guard for editor settings (VS Code, Cursor)
 */
export function isEditorSettings(data: unknown): data is Record<string, unknown> {
  return typeof data === 'object' && data !== null && !Array.isArray(data);
}
