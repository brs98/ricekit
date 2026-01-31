/**
 * Integration snippets for existing app configs
 *
 * When a user already has a config file, we copy these snippets to clipboard
 * instead of overwriting their config.
 */

import { APP_CONFIG } from '../../shared/constants';

export interface AppSnippet {
  snippet: string;
  instructions: string;
}

const themeBasePath = `~/Library/Application Support/${APP_CONFIG.dataDirName}/current/theme`;

/**
 * Integration snippets for each app
 */
export const APP_SNIPPETS = {
  wezterm: {
    snippet: `-- Flowstate WezTerm integration
local colors_path = wezterm.home_dir .. "/Library/Application Support/${APP_CONFIG.dataDirName}/wezterm-colors.lua"
wezterm.add_to_config_reload_watch_list(colors_path)
config.colors = dofile(colors_path)`,
    instructions: 'Add this after your `config = wezterm.config_builder()` line:',
  },

  alacritty: {
    snippet: `import = ["${themeBasePath}/alacritty.toml"]`,
    instructions: 'Add this at the top of your alacritty.toml:',
  },

  kitty: {
    snippet: `include ${themeBasePath}/kitty.conf`,
    instructions: 'Add this at the top of your kitty.conf:',
  },

  starship: {
    snippet: `"$include" = '${themeBasePath}/starship.toml'`,
    instructions: 'Add this at the top of your starship.toml:',
  },

  sketchybar: {
    snippet: `# Flowstate SketchyBar integration
source "$HOME/Library/Application Support/${APP_CONFIG.dataDirName}/current/theme/sketchybar-colors.sh"`,
    instructions: 'Add this near the top of your sketchybarrc (after #!/bin/bash):',
  },

  aerospace: {
    snippet: `# Flowstate AeroSpace/JankyBorders integration
# Note: JankyBorders must be installed for border colors to work
# Install with: brew install FelixKratz/formulae/borders
after-startup-command = [
  'exec-and-forget source "$HOME/Library/Application Support/${APP_CONFIG.dataDirName}/current/theme/aerospace-borders.sh"'
]`,
    instructions: 'Add this to your aerospace.toml (or merge with existing after-startup-command):',
  },

  neovim: {
    snippet: `dofile(vim.fn.expand("${themeBasePath}/neovim.lua"))`,
    instructions: 'Add this at the top of your init.lua:',
  },
} as const satisfies Record<string, AppSnippet>;

export type SnippetAppName = keyof typeof APP_SNIPPETS;

/**
 * Get the integration snippet for an app
 */
export function getSnippet(appName: string): AppSnippet | undefined {
  const normalizedName = appName.toLowerCase() as SnippetAppName;
  return APP_SNIPPETS[normalizedName];
}

/**
 * Check if an app has a snippet defined
 */
export function hasSnippet(appName: string): boolean {
  return appName.toLowerCase() in APP_SNIPPETS;
}
