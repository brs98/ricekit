/**
 * Test utilities for adapter validation
 */

import type { AppAdapter } from '../adapter';
import type { ThemeColors } from '../../../shared/types';

/**
 * Fixture theme colors for testing generators
 */
export const mockThemeColors: ThemeColors = {
  background: '#1a1b26',
  foreground: '#a9b1d6',
  cursor: '#c0caf5',
  selection: '#7aa2f7',
  black: '#32344a',
  red: '#f7768e',
  green: '#9ece6a',
  yellow: '#e0af68',
  blue: '#7aa2f7',
  magenta: '#ad8ee6',
  cyan: '#449dab',
  white: '#787c99',
  brightBlack: '#444b6a',
  brightRed: '#ff7a93',
  brightGreen: '#b9f27c',
  brightYellow: '#ff9e64',
  brightBlue: '#7da6ff',
  brightMagenta: '#bb9af7',
  brightCyan: '#0db9d7',
  brightWhite: '#acb0d0',
  accent: '#7aa2f7',
  border: '#363b54',
};

/**
 * Validate that an adapter has all required fields and correct types.
 * Returns an array of error strings (empty = valid).
 */
export function validateAdapter(adapter: AppAdapter): string[] {
  const errors: string[] = [];

  // Required identity
  if (!adapter.name || typeof adapter.name !== 'string') {
    errors.push('name must be a non-empty string');
  }
  if (adapter.name !== adapter.name.toLowerCase()) {
    errors.push('name must be lowercase');
  }
  if (!adapter.displayName || typeof adapter.displayName !== 'string') {
    errors.push('displayName must be a non-empty string');
  }
  const validCategories = ['terminal', 'editor', 'system', 'tiling'];
  if (!validCategories.includes(adapter.category)) {
    errors.push(`category must be one of: ${validCategories.join(', ')}`);
  }

  // Required detection
  if (!Array.isArray(adapter.installPaths) || adapter.installPaths.length === 0) {
    errors.push('installPaths must be a non-empty array');
  }
  if (!adapter.configPath || typeof adapter.configPath !== 'string') {
    errors.push('configPath must be a non-empty string');
  }

  // Optional configPaths
  if (adapter.configPaths !== undefined) {
    if (!Array.isArray(adapter.configPaths) || adapter.configPaths.length === 0) {
      errors.push('configPaths, if provided, must be a non-empty array');
    }
  }

  // Optional snippet
  if (adapter.snippet) {
    if (!adapter.snippet.code || typeof adapter.snippet.code !== 'string') {
      errors.push('snippet.code must be a non-empty string');
    }
    if (!adapter.snippet.instructions || typeof adapter.snippet.instructions !== 'string') {
      errors.push('snippet.instructions must be a non-empty string');
    }
  }

  // Optional methods
  if (adapter.checkIntegration !== undefined && typeof adapter.checkIntegration !== 'function') {
    errors.push('checkIntegration must be a function if provided');
  }
  if (adapter.notify !== undefined && typeof adapter.notify !== 'function') {
    errors.push('notify must be a function if provided');
  }
  if (adapter.generateThemeConfig !== undefined && typeof adapter.generateThemeConfig !== 'function') {
    errors.push('generateThemeConfig must be a function if provided');
  }

  return errors;
}
