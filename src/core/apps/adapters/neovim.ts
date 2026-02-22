/**
 * Neovim adapter
 *
 * Consolidates Neovim detection, setup, notification, and theme config generation.
 * Uses checkIntegration override to handle directory-based config (init.lua inside nvim/).
 */

import path from 'path';
import os from 'os';
import type { AppAdapter } from '../adapter';
import type { ThemeColors } from '../../../shared/types';
import { APP_CONFIG } from '../../../shared/constants';
import { registerAdapter } from '../registry';
import { existsSync, readFile } from '../../utils/fs';
import { hasRicekitIntegration } from '../setup';
import { blendColors } from '../../../shared/colorUtils';

const homeDir = os.homedir();
const themeBasePath = `~/Library/Application Support/${APP_CONFIG.dataDirName}/current/theme`;

export const neovimAdapter: AppAdapter = {
  name: 'neovim',
  displayName: 'Neovim',
  category: 'editor',

  installPaths: ['/usr/local/bin/nvim', '/opt/homebrew/bin/nvim'],

  configPath: path.join(homeDir, '.config', 'nvim', 'init.lua'),

  // Detection checks the directory; setup creates init.lua inside it
  configPaths: [path.join(homeDir, '.config', 'nvim')],

  templateFile: 'neovim-init.lua',

  snippet: {
    code: `dofile(vim.fn.expand("${themeBasePath}/neovim.lua"))`,
    instructions: 'Add this at the top of your init.lua:',
  },

  async checkIntegration(configPath: string): Promise<boolean> {
    // Neovim's configPath for detection is the nvim directory.
    // We need to check init.lua inside it.
    const initLua = configPath.endsWith('init.lua')
      ? configPath
      : path.join(configPath, 'init.lua');

    if (!existsSync(initLua)) return false;

    try {
      const content = await readFile(initLua);
      return hasRicekitIntegration(content);
    } catch {
      return false;
    }
  },

  generateThemeConfig(colors: ThemeColors) {
    return {
      fileName: 'neovim.lua',
      content: generateNeovimConfig(colors),
    };
  },
};

export function generateNeovimConfig(colors: ThemeColors): string {
  const cursorLineColor = blendColors(colors.background, colors.foreground, 0.05) ?? colors.background;

  return `-- Neovim colorscheme configuration
vim.cmd([[
  hi Normal guibg=${colors.background} guifg=${colors.foreground}
  hi Cursor guibg=${colors.cursor}
  hi Visual guibg=${colors.selection}
  hi LineNr guifg=${colors.brightBlack}
  hi CursorLine guibg=${cursorLineColor}
  hi CursorLineNr guifg=${colors.foreground} guibg=${cursorLineColor}
  hi Comment guifg=${colors.brightBlack}
  hi String guifg=${colors.green}
  hi Function guifg=${colors.blue}
  hi Keyword guifg=${colors.magenta}
  hi Type guifg=${colors.yellow}
  hi Constant guifg=${colors.cyan}
]])
`;
}

registerAdapter(neovimAdapter);
