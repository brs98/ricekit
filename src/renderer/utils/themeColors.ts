import type { ThemeColors } from '../../shared/types';

/**
 * Convert a hex color to space-separated RGB values for CSS variables.
 * Example: "#f5f5f7" -> "245 245 247"
 */
export function hexToRgb(hex: string): string {
  // Remove # if present
  const cleanHex = hex.replace('#', '');

  // Parse hex values
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  return `${r} ${g} ${b}`;
}

/**
 * Calculate relative luminance of a color for contrast calculations.
 * Based on WCAG 2.1 formula.
 */
function getLuminance(hex: string): number {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Determine if a color is "light" (luminance > 0.5).
 */
export function isLightColor(hex: string): boolean {
  return getLuminance(hex) > 0.5;
}

/**
 * Lighten or darken a hex color by a percentage.
 * @param hex - The hex color
 * @param amount - Positive to lighten, negative to darken (-100 to 100)
 */
export function adjustColor(hex: string, amount: number): string {
  const cleanHex = hex.replace('#', '');
  let r = parseInt(cleanHex.substring(0, 2), 16);
  let g = parseInt(cleanHex.substring(2, 4), 16);
  let b = parseInt(cleanHex.substring(4, 6), 16);

  const adjust = (value: number) => {
    if (amount > 0) {
      // Lighten: move toward 255
      return Math.round(value + (255 - value) * (amount / 100));
    } else {
      // Darken: move toward 0
      return Math.round(value * (1 + amount / 100));
    }
  };

  r = Math.max(0, Math.min(255, adjust(r)));
  g = Math.max(0, Math.min(255, adjust(g)));
  b = Math.max(0, Math.min(255, adjust(b)));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Apply theme colors as CSS variables to the document root.
 * Maps theme colors to shadcn/ui CSS variable system.
 */
export function applyThemeColors(colors: ThemeColors, isLight: boolean): void {
  const root = document.documentElement;

  // Primary UI colors derived from theme
  const bgColor = colors.background;
  const fgColor = colors.foreground;
  const accentColor = colors.accent;
  const borderColor = colors.border;

  // Create card/secondary colors by adjusting the background
  const cardColor = isLight
    ? adjustColor(bgColor, 30) // Lighter for light themes
    : adjustColor(bgColor, 20); // Slightly lighter for dark themes

  const secondaryColor = isLight
    ? adjustColor(bgColor, -5) // Slightly darker
    : adjustColor(bgColor, 15); // Slightly lighter

  const mutedColor = isLight
    ? adjustColor(bgColor, -10)
    : adjustColor(bgColor, 20);

  const mutedFgColor = isLight
    ? adjustColor(fgColor, 40) // Lighten the foreground
    : adjustColor(fgColor, -30); // Darken the foreground

  // Set CSS variables
  root.style.setProperty('--background', hexToRgb(bgColor));
  root.style.setProperty('--foreground', hexToRgb(fgColor));
  root.style.setProperty('--card', hexToRgb(cardColor));
  root.style.setProperty('--card-foreground', hexToRgb(fgColor));
  root.style.setProperty('--popover', hexToRgb(cardColor));
  root.style.setProperty('--popover-foreground', hexToRgb(fgColor));
  root.style.setProperty('--primary', hexToRgb(accentColor));
  // Calculate primary foreground based on accent color luminance for proper contrast
  const primaryFg = isLightColor(accentColor) ? '#000000' : '#ffffff';
  root.style.setProperty('--primary-foreground', hexToRgb(primaryFg));
  root.style.setProperty('--secondary', hexToRgb(secondaryColor));
  root.style.setProperty('--secondary-foreground', hexToRgb(fgColor));
  root.style.setProperty('--muted', hexToRgb(mutedColor));
  root.style.setProperty('--muted-foreground', hexToRgb(mutedFgColor));
  root.style.setProperty('--accent', hexToRgb(secondaryColor));
  root.style.setProperty('--accent-foreground', hexToRgb(accentColor));
  root.style.setProperty('--destructive', hexToRgb(colors.red));
  // Calculate destructive foreground based on red color luminance for proper contrast
  const destructiveFg = isLightColor(colors.red) ? '#000000' : '#ffffff';
  root.style.setProperty('--destructive-foreground', hexToRgb(destructiveFg));
  root.style.setProperty('--ring', hexToRgb(accentColor));

  // Border needs special handling for alpha
  const borderRgb = hexToRgb(borderColor);
  root.style.setProperty('--border', `${borderRgb} / 0.3`);
  root.style.setProperty('--input', `${borderRgb} / 0.3`);

  // Store theme colors as additional CSS variables for direct use
  root.style.setProperty('--theme-background', bgColor);
  root.style.setProperty('--theme-foreground', fgColor);
  root.style.setProperty('--theme-accent', accentColor);
  root.style.setProperty('--theme-border', borderColor);
  root.style.setProperty('--theme-selection', colors.selection);
  root.style.setProperty('--theme-cursor', colors.cursor);

  // Terminal colors for any UI elements that want them
  root.style.setProperty('--theme-black', colors.black);
  root.style.setProperty('--theme-red', colors.red);
  root.style.setProperty('--theme-green', colors.green);
  root.style.setProperty('--theme-yellow', colors.yellow);
  root.style.setProperty('--theme-blue', colors.blue);
  root.style.setProperty('--theme-magenta', colors.magenta);
  root.style.setProperty('--theme-cyan', colors.cyan);
  root.style.setProperty('--theme-white', colors.white);

  // Add a class to indicate theme-based styling is active
  root.classList.add('theme-applied');
  root.classList.toggle('theme-light', isLight);
  root.classList.toggle('theme-dark', !isLight);
}

/**
 * Remove theme-based CSS variables and revert to system defaults.
 */
export function clearThemeColors(): void {
  const root = document.documentElement;

  // Remove inline styles
  const themeVars = [
    '--background', '--foreground', '--card', '--card-foreground',
    '--popover', '--popover-foreground', '--primary', '--primary-foreground',
    '--secondary', '--secondary-foreground', '--muted', '--muted-foreground',
    '--accent', '--accent-foreground', '--destructive', '--destructive-foreground',
    '--border', '--input', '--ring',
    '--theme-background', '--theme-foreground', '--theme-accent', '--theme-border',
    '--theme-selection', '--theme-cursor',
    '--theme-black', '--theme-red', '--theme-green', '--theme-yellow',
    '--theme-blue', '--theme-magenta', '--theme-cyan', '--theme-white',
  ];

  themeVars.forEach((varName) => root.style.removeProperty(varName));

  root.classList.remove('theme-applied', 'theme-light', 'theme-dark');
}
