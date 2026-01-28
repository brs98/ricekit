import { execSync } from 'child_process';
import { logger } from '../logger';
import { getErrorMessage } from '../../shared/errors';
import type { FontStatus } from '../../shared/types';

// Common Nerd Fonts that work well with sketchybar
export const SUPPORTED_NERD_FONTS = [
  'Hack Nerd Font',
  'JetBrainsMono Nerd Font',
  'FiraCode Nerd Font',
  'MesloLGS Nerd Font',
  'SauceCodePro Nerd Font',
  'RobotoMono Nerd Font',
  'UbuntuMono Nerd Font',
  'Inconsolata Nerd Font',
  'DroidSansMono Nerd Font',
  'Cousine Nerd Font',
] as const;

export type NerdFontName = (typeof SUPPORTED_NERD_FONTS)[number];

// Homebrew cask names for each font
export const NERD_FONT_CASKS: Record<string, string> = {
  'Hack Nerd Font': 'font-hack-nerd-font',
  'JetBrainsMono Nerd Font': 'font-jetbrains-mono-nerd-font',
  'FiraCode Nerd Font': 'font-fira-code-nerd-font',
  'MesloLGS Nerd Font': 'font-meslo-lg-nerd-font',
  'SauceCodePro Nerd Font': 'font-sauce-code-pro-nerd-font',
  'RobotoMono Nerd Font': 'font-roboto-mono-nerd-font',
  'UbuntuMono Nerd Font': 'font-ubuntu-mono-nerd-font',
  'Inconsolata Nerd Font': 'font-inconsolata-nerd-font',
  'DroidSansMono Nerd Font': 'font-droid-sans-mono-nerd-font',
  'Cousine Nerd Font': 'font-cousine-nerd-font',
};

// Recommended font for new installations
export const RECOMMENDED_NERD_FONT = 'Hack Nerd Font';

/**
 * Get list of installed fonts using fc-list
 */
function getInstalledFonts(): string[] {
  try {
    const output = execSync('fc-list : family', {
      encoding: 'utf-8',
      timeout: 10000,
    });
    return output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error: unknown) {
    logger.warn('Failed to get font list via fc-list:', getErrorMessage(error));
    return [];
  }
}

/**
 * Check if a specific Nerd Font is installed
 */
export function isNerdFontInstalled(fontName: string): boolean {
  const installedFonts = getInstalledFonts();
  return installedFonts.some(
    (font) => font.toLowerCase().includes(fontName.toLowerCase())
  );
}

/**
 * Get the first available Nerd Font from the supported list
 */
export function getAvailableNerdFont(): string | null {
  const installedFonts = getInstalledFonts();

  for (const nerdFont of SUPPORTED_NERD_FONTS) {
    if (installedFonts.some((font) =>
      font.toLowerCase().includes(nerdFont.toLowerCase().replace(' nerd font', ''))
    )) {
      return nerdFont;
    }
  }

  return null;
}

/**
 * Check if any Nerd Font is available
 */
export function hasAnyNerdFont(): boolean {
  return getAvailableNerdFont() !== null;
}

/**
 * Install a Nerd Font via Homebrew
 */
export async function installNerdFont(
  fontName: string = RECOMMENDED_NERD_FONT
): Promise<{ success: boolean; error?: string }> {
  const caskName = NERD_FONT_CASKS[fontName];

  if (!caskName) {
    return { success: false, error: `Unknown font: ${fontName}` };
  }

  try {
    // Check if Homebrew is installed
    try {
      execSync('which brew', { encoding: 'utf-8' });
    } catch {
      return {
        success: false,
        error: 'Homebrew is not installed. Please install Homebrew first: https://brew.sh',
      };
    }

    logger.info(`Installing ${fontName} via Homebrew...`);

    // Install the font cask
    execSync(`brew install --cask ${caskName}`, {
      encoding: 'utf-8',
      timeout: 120000, // 2 minute timeout
      stdio: 'pipe',
    });

    logger.info(`Successfully installed ${fontName}`);
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to install ${fontName}:`, message);
    return { success: false, error: message };
  }
}

/**
 * Get font status for UI display
 */
export function getFontStatus(): FontStatus {
  const installedFont = getAvailableNerdFont();
  return {
    hasNerdFont: installedFont !== null,
    installedFont,
    recommendedFont: RECOMMENDED_NERD_FONT,
    supportedFonts: SUPPORTED_NERD_FONTS,
  };
}
