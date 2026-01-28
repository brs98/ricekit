/**
 * Validation for pasted theme color JSON
 */

import { ThemeColors } from './types';
import { isValidHexColor } from './colorUtils';

// All valid color keys in ThemeColors
const VALID_COLOR_KEYS: (keyof ThemeColors)[] = [
  'background', 'foreground', 'cursor', 'selection',
  'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
  'brightBlack', 'brightRed', 'brightGreen', 'brightYellow',
  'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite',
  'accent', 'border',
];

export interface ValidationResult {
  isValid: boolean;
  validColors: Partial<ThemeColors>;
  invalidColors: { key: string; value: string; reason: string }[];
  message: string;
  status: 'empty' | 'valid' | 'warning' | 'error';
}

const emptyResult: ValidationResult = {
  isValid: false,
  validColors: {},
  invalidColors: [],
  message: '',
  status: 'empty',
};

/**
 * Validate a JSON string containing theme colors
 * Accepts either direct color keys or a ThemeMetadata object with a colors property
 */
export function validateColorJson(input: string): ValidationResult {
  const trimmed = input.trim();

  // Empty input
  if (!trimmed) {
    return emptyResult;
  }

  // Try to parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return {
      isValid: false,
      validColors: {},
      invalidColors: [],
      message: 'Invalid JSON syntax',
      status: 'error',
    };
  }

  // Must be an object
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {
      isValid: false,
      validColors: {},
      invalidColors: [],
      message: 'Expected a JSON object',
      status: 'error',
    };
  }

  const obj = parsed as Record<string, unknown>;

  // Check if it's a ThemeMetadata object (has colors property)
  // Use 'in' operator for property existence check (better narrowing)
  const colorSource = 'colors' in obj && typeof obj.colors === 'object' && obj.colors !== null && !Array.isArray(obj.colors)
    ? (obj.colors as Record<string, unknown>)
    : obj;

  // Extract and validate colors
  const validColors: Partial<ThemeColors> = {};
  const invalidColors: { key: string; value: string; reason: string }[] = [];

  for (const key of VALID_COLOR_KEYS) {
    const value = colorSource[key];

    if (value === undefined) {
      continue;
    }

    if (typeof value !== 'string') {
      invalidColors.push({
        key,
        value: String(value),
        reason: 'Must be a string',
      });
      continue;
    }

    if (!isValidHexColor(value)) {
      invalidColors.push({
        key,
        value,
        reason: 'Invalid hex color (use #RGB or #RRGGBB)',
      });
      continue;
    }

    validColors[key] = value;
  }

  const validCount = Object.keys(validColors).length;
  const invalidCount = invalidColors.length;

  // No colors found at all
  if (validCount === 0 && invalidCount === 0) {
    return {
      isValid: false,
      validColors: {},
      invalidColors: [],
      message: 'No color keys found',
      status: 'error',
    };
  }

  // All invalid
  if (validCount === 0) {
    return {
      isValid: false,
      validColors: {},
      invalidColors,
      message: `All ${invalidCount} colors are invalid`,
      status: 'error',
    };
  }

  // Some invalid (warning)
  if (invalidCount > 0) {
    return {
      isValid: true, // Still allow applying valid colors
      validColors,
      invalidColors,
      message: `${validCount} valid, ${invalidCount} invalid`,
      status: 'warning',
    };
  }

  // All valid
  return {
    isValid: true,
    validColors,
    invalidColors: [],
    message: `${validCount} color${validCount === 1 ? '' : 's'} found`,
    status: 'valid',
  };
}
