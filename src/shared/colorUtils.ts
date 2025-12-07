/**
 * Color utility functions for converting between different color formats
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

/**
 * Validate if a string is a valid hex color
 */
export function isValidHexColor(color: string): boolean {
  // Must start with # and have 3 or 6 hex digits
  const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexPattern.test(color);
}

/**
 * Validate if a string is a valid RGB color
 * Accepts formats: rgb(255, 255, 255) or 255, 255, 255 or 255 255 255
 */
export function isValidRgbColor(color: string): boolean {
  // Remove rgb() wrapper if present
  const cleanedColor = color.replace(/rgb\s*\(\s*|\s*\)/gi, '').trim();

  // Split by comma or whitespace
  const parts = cleanedColor.split(/[,\s]+/).filter(p => p.length > 0);

  if (parts.length !== 3) return false;

  // Check each part is a valid number 0-255
  return parts.every(part => {
    const num = parseInt(part, 10);
    return !isNaN(num) && num >= 0 && num <= 255;
  });
}

/**
 * Validate if a string is a valid HSL color
 * Accepts formats: hsl(360, 100%, 50%) or 360, 100%, 50% or 360 100% 50%
 * Note: For detection to work reliably without hsl() wrapper, at least one % sign should be present
 */
export function isValidHslColor(color: string): boolean {
  const originalColor = color.trim();

  // Remove hsl() wrapper if present
  const cleanedColor = originalColor.replace(/hsl\s*\(\s*|\s*\)/gi, '').trim();

  // Split by comma or whitespace
  const parts = cleanedColor.split(/[,\s]+/).filter(p => p.length > 0);

  if (parts.length !== 3) return false;

  // Parse H (0-360)
  const h = parseFloat(parts[0]);
  if (isNaN(h) || h < 0 || h > 360) return false;

  // Parse S and L (0-100, may have % suffix)
  const s = parseFloat(parts[1].replace(/%/g, ''));
  const l = parseFloat(parts[2].replace(/%/g, ''));

  if (isNaN(s) || s < 0 || s > 100) return false;
  if (isNaN(l) || l < 0 || l > 100) return false;

  // For reliable detection without hsl() wrapper, require at least one % sign
  // OR the presence of hsl() wrapper
  if (!originalColor.includes('hsl(') && !originalColor.includes('%')) {
    // Without hsl() or %, this could be mistaken for RGB, so be more strict
    // Only accept if H value is clearly in hue range (> 255 or has decimal indicating degrees)
    if (h <= 255 && !parts[0].includes('.')) {
      return false;
    }
  }

  return true;
}

/**
 * Parse RGB string to RGB object
 * Accepts: rgb(255, 255, 255) or 255, 255, 255 or 255 255 255
 */
export function parseRgb(color: string): RGB | null {
  if (!isValidRgbColor(color)) return null;

  const cleanedColor = color.replace(/rgb\s*\(\s*|\s*\)/gi, '').trim();
  const parts = cleanedColor.split(/[,\s]+/).filter(p => p.length > 0);

  return {
    r: parseInt(parts[0], 10),
    g: parseInt(parts[1], 10),
    b: parseInt(parts[2], 10),
  };
}

/**
 * Parse HSL string to HSL object
 * Accepts: hsl(360, 100%, 50%) or 360, 100%, 50% or 360 100% 50%
 */
export function parseHsl(color: string): HSL | null {
  if (!isValidHslColor(color)) return null;

  const cleanedColor = color.replace(/hsl\s*\(\s*|\s*\)/gi, '').trim();
  const parts = cleanedColor.split(/[,\s]+/).filter(p => p.length > 0);

  return {
    h: parseFloat(parts[0]),
    s: parseFloat(parts[1].replace('%', '')),
    l: parseFloat(parts[2].replace('%', '')),
  };
}

/**
 * Convert RGB to hex color
 */
export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => {
    const hex = Math.round(n).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * Convert hex to RGB
 */
export function hexToRgb(hex: string): RGB | null {
  if (!isValidHexColor(hex)) return null;

  // Remove # and expand 3-digit hex to 6-digit
  let hexValue = hex.replace('#', '');
  if (hexValue.length === 3) {
    hexValue = hexValue.split('').map(c => c + c).join('');
  }

  return {
    r: parseInt(hexValue.substring(0, 2), 16),
    g: parseInt(hexValue.substring(2, 4), 16),
    b: parseInt(hexValue.substring(4, 6), 16),
  };
}

/**
 * Convert HSL to RGB
 */
export function hslToRgb(hsl: HSL): RGB {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;

  let r, g, b;

  if (s === 0) {
    // Achromatic (gray)
    r = g = b = l;
  } else {
    const hueToRgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hueToRgb(p, q, h + 1/3);
    g = hueToRgb(p, q, h);
    b = hueToRgb(p, q, h - 1/3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

/**
 * Convert RGB to HSL
 */
export function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Convert HSL to hex color
 */
export function hslToHex(hsl: HSL): string {
  const rgb = hslToRgb(hsl);
  return rgbToHex(rgb);
}

/**
 * Convert any supported color format to hex
 * Supports: hex, RGB, HSL
 */
export function toHex(color: string): string | null {
  const trimmedColor = color.trim();

  // Already hex
  if (isValidHexColor(trimmedColor)) {
    return trimmedColor;
  }

  // RGB format
  if (isValidRgbColor(trimmedColor)) {
    const rgb = parseRgb(trimmedColor);
    return rgb ? rgbToHex(rgb) : null;
  }

  // HSL format
  if (isValidHslColor(trimmedColor)) {
    const hsl = parseHsl(trimmedColor);
    return hsl ? hslToHex(hsl) : null;
  }

  return null;
}

/**
 * Detect what format a color string is in
 */
export function detectColorFormat(color: string): 'hex' | 'rgb' | 'hsl' | 'invalid' {
  const trimmedColor = color.trim();

  if (isValidHexColor(trimmedColor)) return 'hex';
  if (isValidRgbColor(trimmedColor)) return 'rgb';
  if (isValidHslColor(trimmedColor)) return 'hsl';

  return 'invalid';
}
