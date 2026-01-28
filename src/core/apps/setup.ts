/**
 * App setup operations
 *
 * Configure applications for Flowstate integration.
 */

import path from 'path';
import os from 'os';
import type { Result } from '../interfaces';
import { ok, err } from '../interfaces';
import {
  existsSync,
  readFile,
  writeFile,
  ensureDir,
  copyFile,
} from '../utils/fs';
import { APP_CONFIG } from '../../shared/constants';

const homeDir = os.homedir();
const themeBasePath = `~/Library/Application Support/${APP_CONFIG.dataDirName}/current/theme`;

/**
 * App configuration definitions
 */
const APP_CONFIGS: Record<string, { configPath: string; importLine: string }> = {
  alacritty: {
    configPath: path.join(homeDir, '.config', 'alacritty', 'alacritty.toml'),
    importLine: `import = ["${themeBasePath}/alacritty.toml"]`,
  },
  kitty: {
    configPath: path.join(homeDir, '.config', 'kitty', 'kitty.conf'),
    importLine: `include ${themeBasePath}/kitty.conf`,
  },
  neovim: {
    configPath: path.join(homeDir, '.config', 'nvim', 'init.lua'),
    importLine: `dofile(vim.fn.expand("${themeBasePath}/neovim.lua"))`,
  },
  starship: {
    configPath: path.join(homeDir, '.config', 'starship.toml'),
    importLine: `"$include" = '${themeBasePath}/starship.toml'`,
  },
  wezterm: {
    configPath: path.join(homeDir, '.config', 'wezterm', 'wezterm.lua'),
    importLine: `-- Flowstate WezTerm integration
local flowstate_colors = wezterm.home_dir .. "/Library/Application Support/${APP_CONFIG.dataDirName}/wezterm-colors.lua"
wezterm.add_to_config_reload_watch_list(flowstate_colors)
config.colors = dofile(flowstate_colors)`,
  },
  sketchybar: {
    configPath: path.join(homeDir, '.config', 'sketchybar', 'sketchybarrc'),
    importLine: `# Flowstate SketchyBar integration
source "$HOME/Library/Application Support/${APP_CONFIG.dataDirName}/current/theme/sketchybar-colors.sh"`,
  },
  aerospace: {
    configPath: path.join(homeDir, '.config', 'aerospace', 'aerospace.toml'),
    importLine: `# Flowstate AeroSpace/JankyBorders integration
# Note: JankyBorders must be installed for border colors to work
# Install with: brew install FelixKratz/formulae/borders
after-startup-command = [
  'exec-and-forget source "$HOME/Library/Application Support/${APP_CONFIG.dataDirName}/current/theme/aerospace-borders.sh"'
]`,
  },
};

/**
 * Setup an application for theming
 */
export async function setupApp(
  appName: string
): Promise<Result<{ configPath: string; backupPath?: string }, Error>> {
  const config = APP_CONFIGS[appName.toLowerCase()];

  if (!config) {
    // Check if it's a special app that needs different handling
    if (appName === 'vscode' || appName === 'cursor') {
      return err(new Error(
        `${appName} integration is automatic. Just apply a theme and ${appName} settings will be updated.`
      ));
    }
    if (appName === 'slack') {
      return err(new Error(
        'Slack requires manual setup. Apply a theme, then copy the contents of slack-theme.txt to Slack Preferences → Themes → Custom theme.'
      ));
    }

    const supportedApps = (Object.keys(APP_CONFIGS) as AppConfigKey[]).join(', ');
    return err(new Error(`Unsupported app: ${appName}. Supported: ${supportedApps}`));
  }

  const { configPath, importLine } = config;
  const configDir = path.dirname(configPath);

  // Create config directory if it doesn't exist
  if (!existsSync(configDir)) {
    await ensureDir(configDir);
  }

  // Read existing config or create empty
  let configContent = '';
  let backupPath: string | undefined;

  if (existsSync(configPath)) {
    configContent = await readFile(configPath);

    // Check if import already exists
    if (configContent.includes(importLine) || configContent.includes(`${APP_CONFIG.dataDirName}/current/theme`)) {
      return err(new Error(`Flowstate integration already exists in ${configPath}`));
    }

    // Create backup
    backupPath = `${configPath}.flowstate-backup`;
    await copyFile(configPath, backupPath);
  }

  // Add import statement at the top of the file
  const newContent = importLine + '\n\n' + configContent;
  await writeFile(configPath, newContent);

  return ok({ configPath, backupPath });
}

type AppConfigKey = keyof typeof APP_CONFIGS;

/**
 * Get list of apps that can be set up
 */
export function getSetupableApps(): AppConfigKey[] {
  return Object.keys(APP_CONFIGS) as AppConfigKey[];
}
