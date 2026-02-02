import { useEffect, useCallback, useRef } from 'react';
import { applyThemeColors } from '../utils/themeColors';

// Custom event name for theme changes
export const THEME_APPLIED_EVENT = 'ricekit:theme-applied';

/**
 * Emit a custom event to notify that a theme has been applied.
 * Call this after window.electronAPI.applyTheme() succeeds.
 */
export function emitThemeApplied(): void {
  window.dispatchEvent(new CustomEvent(THEME_APPLIED_EVENT));
}

/**
 * Hook that applies the current theme's colors to the app's UI.
 * This makes the app "self-theme" with the colors of the applied theme.
 */
export function useThemeSelfStyling(): {
  refreshThemeColors: () => Promise<void>;
} {
  const isInitialized = useRef(false);

  const loadAndApplyTheme = useCallback(async () => {
    try {
      // Get the current state to find which theme is applied
      const state = await window.electronAPI.getState();
      if (!state?.currentTheme) {
        console.log('No current theme set, using default styling');
        return;
      }

      // Load the theme's metadata to get colors
      const theme = await window.electronAPI.getTheme(state.currentTheme);
      if (!theme?.metadata?.colors) {
        console.warn(`Theme "${state.currentTheme}" has no colors, using default styling`);
        return;
      }

      // Apply the theme colors to CSS variables
      applyThemeColors(theme.metadata.colors, theme.isLight);
      console.log(`Applied self-theming from: ${theme.name} (${theme.isLight ? 'light' : 'dark'})`);
    } catch (error: unknown) {
      console.error('Failed to apply theme self-styling:', error);
    }
  }, []);

  // Load and apply theme colors on mount
  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      loadAndApplyTheme();
    }
  }, [loadAndApplyTheme]);

  // Listen for theme-applied events (from same window, e.g., ThemeGrid)
  useEffect(() => {
    const handleThemeApplied = () => {
      loadAndApplyTheme();
    };

    window.addEventListener(THEME_APPLIED_EVENT, handleThemeApplied);
    return () => {
      window.removeEventListener(THEME_APPLIED_EVENT, handleThemeApplied);
    };
  }, [loadAndApplyTheme]);

  // Listen for IPC theme:changed events (from main process, e.g., scheduler, quick switcher)
  useEffect(() => {
    // This handles theme changes triggered from outside this window:
    // - Scheduler applies a theme
    // - Quick switcher applies a theme (separate window)
    // - Tray menu applies a theme
    window.electronAPI.onThemeChanged(() => {
      console.log('Received theme:changed IPC event');
      loadAndApplyTheme();
    });
    // Note: Electron IPC listeners don't return unsubscribe functions in this setup,
    // but that's okay since this component lives for the app's lifetime
  }, [loadAndApplyTheme]);

  return {
    refreshThemeColors: loadAndApplyTheme,
  };
}
