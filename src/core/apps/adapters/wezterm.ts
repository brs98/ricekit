/**
 * WezTerm adapter
 *
 * Consolidates WezTerm detection, setup, notification, and theme config generation.
 */

import path from 'path';
import os from 'os';
import type { AppAdapter } from '../adapter';
import type { ThemeColors } from '../../../shared/types';
import { APP_CONFIG } from '../../../shared/constants';
import { registerAdapter } from '../registry';
import { existsSync, copyFile, touch } from '../../utils/fs';

const homeDir = os.homedir();

export const weztermAdapter: AppAdapter = {
  name: 'wezterm',
  displayName: 'WezTerm',
  category: 'terminal',

  installPaths: [
    '/Applications/WezTerm.app',
    path.join(homeDir, 'Applications', 'WezTerm.app'),
  ],

  configPath: path.join(homeDir, '.config', 'wezterm', 'wezterm.lua'),

  configPaths: [
    path.join(homeDir, '.wezterm.lua'),
    path.join(homeDir, '.config', 'wezterm', 'wezterm.lua'),
  ],

  templateFile: 'wezterm.lua',

  snippet: {
    code: `-- Ricekit WezTerm integration
local colors_path = wezterm.home_dir .. "/Library/Application Support/${APP_CONFIG.dataDirName}/wezterm-colors.lua"
wezterm.add_to_config_reload_watch_list(colors_path)
config.colors = dofile(colors_path)`,
    instructions: 'Add this after your `config = wezterm.config_builder()` line:',
  },

  async notify(themePath: string, onLog?: (msg: string) => void): Promise<boolean> {
    try {
      const weztermThemeSrc = path.join(themePath, 'wezterm.lua');
      const weztermThemeDest = path.join(
        homeDir,
        'Library',
        'Application Support',
        'Ricekit',
        'wezterm-colors.lua'
      );

      if (existsSync(weztermThemeSrc)) {
        await copyFile(weztermThemeSrc, weztermThemeDest);

        const weztermConfigPaths = [
          path.join(homeDir, '.wezterm.lua'),
          path.join(homeDir, '.config', 'wezterm', 'wezterm.lua'),
        ];
        for (const configPath of weztermConfigPaths) {
          if (existsSync(configPath)) {
            await touch(configPath);
            break;
          }
        }

        onLog?.('✓ WezTerm theme file updated');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  generateThemeConfig(colors: ThemeColors) {
    return {
      fileName: 'wezterm.lua',
      content: generateWeztermConfig(colors),
    };
  },
};

export function generateWeztermConfig(colors: ThemeColors): string {
  return `-- WezTerm color configuration
-- Add this to your wezterm.lua or require() this file
return {
  foreground = "${colors.foreground}",
  background = "${colors.background}",
  cursor_bg = "${colors.cursor}",
  cursor_fg = "${colors.background}",
  cursor_border = "${colors.cursor}",
  selection_bg = "${colors.brightBlack}",
  selection_fg = "${colors.foreground}",
  scrollbar_thumb = "${colors.brightBlack}",
  split = "${colors.border}",

  ansi = {
    "${colors.black}",
    "${colors.red}",
    "${colors.green}",
    "${colors.yellow}",
    "${colors.blue}",
    "${colors.magenta}",
    "${colors.cyan}",
    "${colors.white}",
  },
  brights = {
    "${colors.brightBlack}",
    "${colors.brightRed}",
    "${colors.brightGreen}",
    "${colors.brightYellow}",
    "${colors.brightBlue}",
    "${colors.brightMagenta}",
    "${colors.brightCyan}",
    "${colors.brightWhite}",
  },

  tab_bar = {
    background = "${colors.background}",
    active_tab = {
      bg_color = "${colors.selection}",
      fg_color = "${colors.background}",
    },
    inactive_tab = {
      bg_color = "${colors.background}",
      fg_color = "${colors.brightBlack}",
    },
    inactive_tab_hover = {
      bg_color = "${colors.selection}",
      fg_color = "${colors.background}",
    },
    new_tab = {
      bg_color = "${colors.background}",
      fg_color = "${colors.brightBlack}",
    },
    new_tab_hover = {
      bg_color = "${colors.selection}",
      fg_color = "${colors.background}",
    },
  },
}
`;
}

registerAdapter(weztermAdapter);
