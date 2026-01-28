/**
 * Color derivation engine for simplified theme creation
 * Automatically calculates derived colors from base colors using OKLCH color space
 */

import { ThemeColors, DerivedColorKey, ColorLockState, typedEntries } from './types';
import { adjustLightness, blendColors, hexToOklch } from './colorUtils';

// Re-export types for convenience
export type { DerivedColorKey, ColorLockState };

// The 10 base colors that users must provide
export type BaseColorKey =
  | 'background'
  | 'foreground'
  | 'black'
  | 'red'
  | 'green'
  | 'yellow'
  | 'blue'
  | 'magenta'
  | 'cyan'
  | 'white';

// Configuration for derivation amounts (readonly to prevent accidental mutation)
const DERIVATION_CONFIG = {
  brightLightnessBoost: 0.18,  // +18% lightness for bright variants
  selectionBlendFactor: 0.30,  // 30% accent blended into background
  borderShiftFactor: 0.12,     // 12% shift toward foreground
} as const;

// Bright color keys that map to base colors
type BrightColorKey = 'brightBlack' | 'brightRed' | 'brightGreen' | 'brightYellow' | 'brightBlue' | 'brightMagenta' | 'brightCyan' | 'brightWhite';

// Mapping from bright colors to their base color
const brightToBase = {
  brightBlack: 'black',
  brightRed: 'red',
  brightGreen: 'green',
  brightYellow: 'yellow',
  brightBlue: 'blue',
  brightMagenta: 'magenta',
  brightCyan: 'cyan',
  brightWhite: 'white',
} as const satisfies Record<BrightColorKey, BaseColorKey>;

/**
 * Get the default lock state (all unlocked)
 */
export function getDefaultLockState(): ColorLockState {
  return {
    brightBlack: false,
    brightRed: false,
    brightGreen: false,
    brightYellow: false,
    brightBlue: false,
    brightMagenta: false,
    brightCyan: false,
    brightWhite: false,
    cursor: false,
    selection: false,
    border: false,
    accent: false,
  };
}

/**
 * Derive a bright color from its base by increasing lightness in OKLCH space
 */
export function deriveBrightColor(baseHex: string): string {
  const result = adjustLightness(baseHex, DERIVATION_CONFIG.brightLightnessBoost);
  return result || baseHex;
}

/**
 * Derive the selection color by blending accent into background
 */
export function deriveSelection(accent: string, background: string): string {
  const result = blendColors(background, accent, DERIVATION_CONFIG.selectionBlendFactor);
  return result || accent;
}

/**
 * Derive the border color by shifting background toward foreground
 */
export function deriveBorder(background: string, foreground: string): string {
  const result = blendColors(background, foreground, DERIVATION_CONFIG.borderShiftFactor);
  return result || background;
}

/**
 * Derive cursor color (defaults to foreground)
 */
export function deriveCursor(foreground: string): string {
  return foreground;
}

/**
 * Derive accent color (defaults to blue)
 */
export function deriveAccent(blue: string): string {
  return blue;
}

/**
 * Check if a theme is likely a light theme based on background/foreground lightness
 */
export function isLightTheme(background: string, foreground: string): boolean {
  const bgLch = hexToOklch(background);
  const fgLch = hexToOklch(foreground);
  if (!bgLch || !fgLch) return false;
  return bgLch.l > fgLch.l;
}

/**
 * Main derivation function - calculates all derived colors from base colors
 *
 * @param baseColors - Partial theme colors containing at least the 10 base colors
 * @param locks - Which derived colors are locked (won't be recalculated)
 * @param currentColors - Current full color set (used to preserve locked colors)
 * @returns Complete ThemeColors with all 22 colors
 */
export function deriveAllColors(
  baseColors: Partial<ThemeColors>,
  locks: ColorLockState,
  currentColors?: Partial<ThemeColors>
): ThemeColors {
  // Start with base colors (use defaults if not provided)
  const result: ThemeColors = {
    background: baseColors.background || '#1a1b26',
    foreground: baseColors.foreground || '#c0caf5',
    black: baseColors.black || '#15161e',
    red: baseColors.red || '#f7768e',
    green: baseColors.green || '#9ece6a',
    yellow: baseColors.yellow || '#e0af68',
    blue: baseColors.blue || '#7aa2f7',
    magenta: baseColors.magenta || '#bb9af7',
    cyan: baseColors.cyan || '#7dcfff',
    white: baseColors.white || '#a9b1d6',
    // These will be derived below
    brightBlack: '',
    brightRed: '',
    brightGreen: '',
    brightYellow: '',
    brightBlue: '',
    brightMagenta: '',
    brightCyan: '',
    brightWhite: '',
    cursor: '',
    selection: '',
    border: '',
    accent: '',
  };

  // Derive accent first (other derivations may depend on it)
  if (locks.accent && currentColors?.accent) {
    result.accent = currentColors.accent;
  } else {
    result.accent = deriveAccent(result.blue);
  }

  // Derive bright colors
  for (const [brightKey, baseKey] of typedEntries(brightToBase)) {
    const lockedValue = currentColors?.[brightKey];
    if (locks[brightKey] && lockedValue) {
      result[brightKey] = lockedValue;
    } else {
      result[brightKey] = deriveBrightColor(result[baseKey]);
    }
  }

  // Derive cursor
  if (locks.cursor && currentColors?.cursor) {
    result.cursor = currentColors.cursor;
  } else {
    result.cursor = deriveCursor(result.foreground);
  }

  // Derive selection
  if (locks.selection && currentColors?.selection) {
    result.selection = currentColors.selection;
  } else {
    result.selection = deriveSelection(result.accent, result.background);
  }

  // Derive border
  if (locks.border && currentColors?.border) {
    result.border = currentColors.border;
  } else {
    result.border = deriveBorder(result.background, result.foreground);
  }

  return result;
}

/**
 * Extract only the base colors from a full ThemeColors object
 */
export function extractBaseColors(colors: ThemeColors): Pick<ThemeColors, BaseColorKey> {
  return {
    background: colors.background,
    foreground: colors.foreground,
    black: colors.black,
    red: colors.red,
    green: colors.green,
    yellow: colors.yellow,
    blue: colors.blue,
    magenta: colors.magenta,
    cyan: colors.cyan,
    white: colors.white,
  };
}

/**
 * Check if a color key is a base color
 */
export function isBaseColor(key: keyof ThemeColors): key is BaseColorKey {
  const baseKeys: BaseColorKey[] = [
    'background', 'foreground', 'black', 'red', 'green',
    'yellow', 'blue', 'magenta', 'cyan', 'white',
  ];
  return baseKeys.includes(key as BaseColorKey);
}

/**
 * Check if a color key is a derived color
 */
export function isDerivedColor(key: keyof ThemeColors): key is DerivedColorKey {
  const derivedKeys: DerivedColorKey[] = [
    'brightBlack', 'brightRed', 'brightGreen', 'brightYellow',
    'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite',
    'cursor', 'selection', 'border', 'accent',
  ];
  return derivedKeys.includes(key as DerivedColorKey);
}

/**
 * Get a human-readable description of how a derived color is calculated
 */
export function getDerivationDescription(key: DerivedColorKey): string {
  switch (key) {
    case 'cursor':
      return 'Same as foreground';
    case 'selection':
      return 'Background blended 30% toward accent';
    case 'border':
      return 'Background shifted 12% toward foreground';
    case 'accent':
      return 'Same as blue';
    case 'brightBlack':
      return 'black + 18% lightness';
    case 'brightRed':
      return 'red + 18% lightness';
    case 'brightGreen':
      return 'green + 18% lightness';
    case 'brightYellow':
      return 'yellow + 18% lightness';
    case 'brightBlue':
      return 'blue + 18% lightness';
    case 'brightMagenta':
      return 'magenta + 18% lightness';
    case 'brightCyan':
      return 'cyan + 18% lightness';
    case 'brightWhite':
      return 'white + 18% lightness';
    default: {
      // Exhaustive check: if a new DerivedColorKey is added, this will error
      const _exhaustive: never = key;
      throw new Error(`Unhandled derived color key: ${_exhaustive}`);
    }
  }
}
