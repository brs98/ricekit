const basePath = '~/Library/Application Support/Ricekit/current/theme';

export function getImportStatement(appName: string): string {
  switch (appName) {
    case 'wezterm':
      return `-- Ricekit WezTerm integration
local ricekit_colors = wezterm.home_dir .. "/Library/Application Support/Ricekit/wezterm-colors.lua"
wezterm.add_to_config_reload_watch_list(ricekit_colors)
config.colors = dofile(ricekit_colors)`;
    case 'neovim':
      return `dofile(vim.fn.expand("${basePath}/neovim.lua"))`;
    case 'sketchybar':
      return `# Add to your sketchybarrc:
source "$CONFIG_DIR/colors.sh"

# Or source from Ricekit:
source "${basePath}/sketchybar-colors.sh"`;
    case 'aerospace':
      return `# Add to your aerospace.toml:
# Note: JankyBorders is required for border colors
# Install with: brew install FelixKratz/formulae/borders

after-startup-command = [
  'exec-and-forget source "${basePath}/aerospace-borders.sh"'
]`;
    default:
      return `# Import theme from: ${basePath}/${appName}.conf`;
  }
}

export function getSetupInstructions(appName: string, configPath: string): string[] {
  switch (appName) {
    case 'neovim':
      return [
        `Open your Neovim init file: ${configPath}/init.lua or init.vim`,
        'Add the dofile line to load the theme',
        'Save the file',
        'Restart Neovim or run :source $MYVIMRC'
      ];
    case 'wezterm':
      return [
        `Open your WezTerm config: ${configPath}`,
        'Add the code snippet after your config = wezterm.config_builder() line',
        'The add_to_config_reload_watch_list line enables auto-reload on theme change',
        'Save the file - WezTerm will reload automatically'
      ];
    case 'sketchybar':
      return [
        `Open your SketchyBar config: ${configPath}`,
        'Add the source line to import colors at the top of your config',
        'Use the exported color variables (e.g., $BAR_COLOR, $ICON_COLOR) in your sketchybarrc',
        'Save the file and run: sketchybar --reload'
      ];
    case 'aerospace':
      return [
        'First, install JankyBorders if not already installed: brew install FelixKratz/formulae/borders',
        `Open your AeroSpace config file: ${configPath}`,
        'Add the after-startup-command block to run JankyBorders with theme colors',
        'Save the file and restart AeroSpace (only needed once for initial setup)',
        'JankyBorders will display colored borders around active/inactive windows',
        'Use the "Refresh" button to update border colors without restarting AeroSpace'
      ];
    default:
      return [
        `Open the app's configuration file: ${configPath}`,
        'Add the import/include statement',
        'Save the file',
        'Restart the application'
      ];
  }
}
