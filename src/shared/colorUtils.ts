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
  const hPart = parts[0];
  const sPart = parts[1];
  const lPart = parts[2];
  if (!hPart || !sPart || !lPart) return false;

  const h = parseFloat(hPart);
  if (isNaN(h) || h < 0 || h > 360) return false;

  // Parse S and L (0-100, may have % suffix)
  const s = parseFloat(sPart.replace(/%/g, ''));
  const l = parseFloat(lPart.replace(/%/g, ''));

  if (isNaN(s) || s < 0 || s > 100) return false;
  if (isNaN(l) || l < 0 || l > 100) return false;

  // For reliable detection without hsl() wrapper, require at least one % sign
  // OR the presence of hsl() wrapper
  if (!originalColor.includes('hsl(') && !originalColor.includes('%')) {
    // Without hsl() or %, this could be mistaken for RGB, so be more strict
    // Only accept if H value is clearly in hue range (> 255 or has decimal indicating degrees)
    if (h <= 255 && !hPart.includes('.')) {
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

  const rPart = parts[0];
  const gPart = parts[1];
  const bPart = parts[2];
  if (!rPart || !gPart || !bPart) return null;

  return {
    r: parseInt(rPart, 10),
    g: parseInt(gPart, 10),
    b: parseInt(bPart, 10),
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

  const hPart = parts[0];
  const sPart = parts[1];
  const lPart = parts[2];
  if (!hPart || !sPart || !lPart) return null;

  return {
    h: parseFloat(hPart),
    s: parseFloat(sPart.replace('%', '')),
    l: parseFloat(lPart.replace('%', '')),
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
      default:
        // max is always one of r, g, or b by definition of Math.max
        throw new Error(`Unexpected max value in rgbToHsl: ${max}`);
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

// ============================================================================
// OKLCH Color Space Utilities
// OKLCH is a perceptually uniform color space ideal for color manipulation
// ============================================================================

export interface OKLab {
  L: number;  // Lightness: 0-1
  a: number;  // Green-Red axis: ~-0.4 to 0.4
  b: number;  // Blue-Yellow axis: ~-0.4 to 0.4
}

export interface OKLCH {
  l: number;  // Lightness: 0-1
  c: number;  // Chroma: 0-0.4 (typical range)
  h: number;  // Hue: 0-360 degrees
}

/**
 * Convert sRGB component (0-255) to linear RGB (0-1)
 */
function srgbToLinear(value: number): number {
  const v = value / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/**
 * Convert linear RGB (0-1) to sRGB component (0-255)
 */
function linearToSrgb(value: number): number {
  const v = value <= 0.0031308 ? 12.92 * value : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
  return Math.round(Math.max(0, Math.min(255, v * 255)));
}

/**
 * Convert RGB to OKLab color space
 */
export function rgbToOklab(rgb: RGB): OKLab {
  // Convert sRGB to linear RGB
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);

  // Linear RGB to LMS (cone responses)
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  // Cube root of LMS
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  // LMS to OKLab
  return {
    L: 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  };
}

/**
 * Convert OKLab to RGB color space
 */
export function oklabToRgb(lab: OKLab): RGB {
  // OKLab to LMS (cube root space)
  const l_ = lab.L + 0.3963377774 * lab.a + 0.2158037573 * lab.b;
  const m_ = lab.L - 0.1055613458 * lab.a - 0.0638541728 * lab.b;
  const s_ = lab.L - 0.0894841775 * lab.a - 1.2914855480 * lab.b;

  // Cube to get LMS
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  // LMS to linear RGB
  const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const b = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  // Linear RGB to sRGB
  return {
    r: linearToSrgb(r),
    g: linearToSrgb(g),
    b: linearToSrgb(b),
  };
}

/**
 * Convert OKLab to OKLCH (polar form)
 */
export function oklabToOklch(lab: OKLab): OKLCH {
  const c = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  let h = Math.atan2(lab.b, lab.a) * 180 / Math.PI;
  if (h < 0) h += 360;

  return {
    l: lab.L,
    c: c,
    h: c < 0.0001 ? 0 : h,  // Hue is meaningless for near-zero chroma
  };
}

/**
 * Convert OKLCH to OKLab (rectangular form)
 */
export function oklchToOklab(lch: OKLCH): OKLab {
  const hRad = lch.h * Math.PI / 180;
  return {
    L: lch.l,
    a: lch.c * Math.cos(hRad),
    b: lch.c * Math.sin(hRad),
  };
}

/**
 * Convert hex color to OKLCH
 */
export function hexToOklch(hex: string): OKLCH | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;

  const lab = rgbToOklab(rgb);
  return oklabToOklch(lab);
}

/**
 * Convert OKLCH to hex color
 * Includes gamut mapping to ensure the result is valid sRGB
 */
export function oklchToHex(lch: OKLCH): string {
  // Clamp lightness
  const clampedLch: OKLCH = {
    l: Math.max(0, Math.min(1, lch.l)),
    c: Math.max(0, lch.c),
    h: lch.h,
  };

  // Convert to RGB
  const lab = oklchToOklab(clampedLch);
  let rgb = oklabToRgb(lab);

  // Check if we're out of gamut and reduce chroma if needed
  if (rgb.r < 0 || rgb.r > 255 || rgb.g < 0 || rgb.g > 255 || rgb.b < 0 || rgb.b > 255) {
    // Binary search to find max in-gamut chroma
    let low = 0;
    let high = clampedLch.c;

    for (let i = 0; i < 12; i++) {
      const mid = (low + high) / 2;
      const testLch: OKLCH = { l: clampedLch.l, c: mid, h: clampedLch.h };
      const testLab = oklchToOklab(testLch);
      const testRgb = oklabToRgb(testLab);

      if (testRgb.r >= 0 && testRgb.r <= 255 &&
          testRgb.g >= 0 && testRgb.g <= 255 &&
          testRgb.b >= 0 && testRgb.b <= 255) {
        low = mid;
      } else {
        high = mid;
      }
    }

    // Use the in-gamut chroma
    const finalLch: OKLCH = { l: clampedLch.l, c: low, h: clampedLch.h };
    const finalLab = oklchToOklab(finalLch);
    rgb = oklabToRgb(finalLab);
  }

  return rgbToHex(rgb);
}

/**
 * Adjust the lightness of a color in OKLCH space
 */
export function adjustLightness(hex: string, amount: number): string | null {
  const lch = hexToOklch(hex);
  if (!lch) return null;

  return oklchToHex({
    l: lch.l + amount,
    c: lch.c,
    h: lch.h,
  });
}

/**
 * Blend two colors in OKLCH space
 */
export function blendColors(hex1: string, hex2: string, factor: number): string | null {
  const lch1 = hexToOklch(hex1);
  const lch2 = hexToOklch(hex2);
  if (!lch1 || !lch2) return null;

  // Handle hue interpolation (shortest path around the circle)
  let h1 = lch1.h;
  let h2 = lch2.h;
  const hueDiff = h2 - h1;

  if (Math.abs(hueDiff) > 180) {
    if (hueDiff > 0) {
      h1 += 360;
    } else {
      h2 += 360;
    }
  }

  const blendedH = h1 + (h2 - h1) * factor;

  return oklchToHex({
    l: lch1.l + (lch2.l - lch1.l) * factor,
    c: lch1.c + (lch2.c - lch1.c) * factor,
    h: ((blendedH % 360) + 360) % 360,
  });
}
