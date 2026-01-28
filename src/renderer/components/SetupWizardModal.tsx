import { useState } from 'react';
import { Copy, Check, Zap } from 'lucide-react';
import type { AppInfo } from '../../shared/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/renderer/components/ui/dialog';
import { Button } from '@/renderer/components/ui/button';

interface SetupWizardModalProps {
  app: AppInfo;
  onClose: () => void;
  onSetupComplete: () => void;
}

export function SetupWizardModal({ app, onClose, onSetupComplete }: SetupWizardModalProps) {
  const [copied, setCopied] = useState(false);
  const [setupInProgress, setSetupInProgress] = useState(false);

  // Generate import statement based on app type
  const getImportStatement = (): string => {
    const basePath = '~/Library/Application Support/Flowstate/current/theme';

    switch (app.name) {
      case 'alacritty':
        return `import = ["${basePath}/alacritty.toml"]`;
      case 'kitty':
        return `include ${basePath}/kitty.conf`;
      case 'iterm2':
        return 'iTerm2 uses .itermcolors files. Load via Preferences → Profiles → Colors → Color Presets → Import';
      case 'warp':
        return `# Add to ~/.warp/themes/\ncp "${basePath}/warp.yaml" ~/.warp/themes/flowstate.yaml`;
      case 'hyper':
        return `# Add to ~/.hyper.js config section\ncolors: require('${basePath}/hyper.js')`;
      case 'wezterm':
        return `-- Flowstate WezTerm integration
local flowstate_colors = wezterm.home_dir .. "/Library/Application Support/Flowstate/wezterm-colors.lua"
wezterm.add_to_config_reload_watch_list(flowstate_colors)
config.colors = dofile(flowstate_colors)`;
      case 'vscode':
        return 'VS Code themes are applied automatically via settings.json modification';
      case 'neovim':
        return `dofile(vim.fn.expand("${basePath}/neovim.lua"))`;
      case 'sublime':
        return `# Copy theme file\ncp "${basePath}/sublime.tmTheme" ~/Library/Application\\ Support/Sublime\\ Text/Packages/User/`;
      case 'bat':
        return `--theme="${basePath}/bat.conf"`;
      case 'delta':
        return `[include]\n    path = ${basePath}/delta.gitconfig`;
      case 'starship':
        return `"$include" = '${basePath}/starship.toml'`;
      case 'fzf':
        return `export FZF_DEFAULT_OPTS="--color=bg+:#1a1b26,bg:#24283b,spinner:#7aa2f7"`;
      case 'lazygit':
        return `# Add to ~/.config/lazygit/config.yml\ngui:\n  theme:\n    activeBorderColor: ["#7aa2f7", "bold"]`;
      case 'zsh-syntax-highlighting':
        return `source ${basePath}/zsh-theme.zsh`;
      case 'raycast':
        return 'Raycast themes are managed through Raycast settings';
      case 'alfred':
        return 'Alfred themes use .alfredappearance files. Import via Alfred preferences';
      case 'sketchybar':
        return `# Add to your sketchybarrc:
source "$CONFIG_DIR/colors.sh"

# Or source from Flowstate:
source "${basePath}/sketchybar-colors.sh"`;
      case 'slack':
        return `# Slack requires manual theme application
# Click "Automatic Setup" below to open the theme file
# Then copy the theme string and paste it in Slack
# Theme file: ${basePath}/slack-theme.txt`;
      case 'aerospace':
        return `# Add to your aerospace.toml:
# Note: JankyBorders is required for border colors
# Install with: brew install FelixKratz/formulae/borders

after-startup-command = [
  'exec-and-forget source "${basePath}/aerospace-borders.sh"'
]`;
      default:
        return `# Import theme from: ${basePath}/${app.name}.conf`;
    }
  };

  // Get setup instructions based on app
  const getSetupInstructions = (): string[] => {
    switch (app.name) {
      case 'alacritty':
        return [
          `Open your Alacritty config file: ${app.configPath}`,
          'Add the import statement at the top of the file',
          'Save the file',
          'Restart Alacritty or it will reload automatically'
        ];
      case 'kitty':
        return [
          `Open your Kitty config file: ${app.configPath}`,
          'Add the include line anywhere in the file',
          'Save the file',
          'Run: kitty @ load-config to reload instantly'
        ];
      case 'neovim':
        return [
          `Open your Neovim init file: ${app.configPath}/init.lua or init.vim`,
          'Add the dofile line to load the theme',
          'Save the file',
          'Restart Neovim or run :source $MYVIMRC'
        ];
      case 'vscode':
        return [
          'VS Code integration is automatic',
          'Flowstate will modify your settings.json',
          'Click "Automatic Setup" below to configure',
          'Or manually edit settings.json to include theme colors'
        ];
      case 'starship':
        return [
          `Open your Starship config: ${app.configPath}`,
          'Add the $include line at the top',
          'Save the file',
          'Restart your shell or reload config'
        ];
      case 'wezterm':
        return [
          `Open your WezTerm config: ${app.configPath}`,
          'Add the code snippet after your config = wezterm.config_builder() line',
          'The add_to_config_reload_watch_list line enables auto-reload on theme change',
          'Save the file - WezTerm will reload automatically'
        ];
      case 'bat':
        return [
          'Add the bat theme flag to your shell config (~/.zshrc or ~/.bashrc)',
          'Example: alias bat="bat --theme=...path..."',
          'Or set BAT_THEME environment variable',
          'Restart your shell'
        ];
      case 'delta':
        return [
          'Open your git config: ~/.gitconfig',
          'Add the include statement in the [include] section',
          'If no [include] section exists, create one',
          'Save and test with: git diff'
        ];
      case 'sketchybar':
        return [
          `Open your SketchyBar config: ${app.configPath}`,
          'Add the source line to import colors at the top of your config',
          'Use the exported color variables (e.g., $BAR_COLOR, $ICON_COLOR) in your sketchybarrc',
          'Save the file and run: sketchybar --reload'
        ];
      case 'slack':
        return [
          'Open Slack Preferences (Cmd+,)',
          'Go to "Themes" in the sidebar',
          'Scroll down and click "Create a custom theme"',
          `Open the theme file: ${app.configPath}`,
          'Copy the theme string from the file and paste it into Slack',
          'The theme will be applied automatically when you switch themes in Flowstate'
        ];
      case 'aerospace':
        return [
          'First, install JankyBorders if not already installed: brew install FelixKratz/formulae/borders',
          `Open your AeroSpace config file: ${app.configPath}`,
          'Add the after-startup-command block to run JankyBorders with theme colors',
          'Save the file and restart AeroSpace (only needed once for initial setup)',
          'JankyBorders will display colored borders around active/inactive windows',
          'Use the "Refresh" button to update border colors without restarting AeroSpace'
        ];
      default:
        return [
          `Open the app's configuration file: ${app.configPath}`,
          'Add the import/include statement',
          'Save the file',
          'Restart the application'
        ];
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getImportStatement());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error: unknown) {
      console.error('Failed to copy:', error);
    }
  };

  const handleAutomaticSetup = async () => {
    try {
      setSetupInProgress(true);
      await window.electronAPI.setupApp(app.name);
      onSetupComplete();
    } catch (error: unknown) {
      console.error('Setup failed:', error);
      alert('Automatic setup failed. Please follow manual instructions.');
    } finally {
      setSetupInProgress(false);
    }
  };

  const importStatement = getImportStatement();
  const instructions = getSetupInstructions();
  const supportsAutomaticSetup = ['alacritty', 'kitty', 'neovim', 'vscode', 'starship', 'wezterm', 'sketchybar', 'slack', 'cursor', 'aerospace'].includes(app.name);

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Setup {app.displayName}</DialogTitle>
          <DialogDescription>
            Configure {app.displayName} to use Flowstate
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            To use Flowstate with {app.displayName}, you need to configure it to import
            theme settings from Flowstate&apos;s current theme directory.
          </p>

          {/* Import Statement */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Import Statement</h3>
            <div className="relative">
              <pre className="bg-muted p-4 rounded-[8px] text-sm overflow-x-auto font-mono">
                <code>{importStatement}</code>
              </pre>
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Setup Instructions</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              {instructions.map((instruction, index) => (
                <li key={index}>{instruction}</li>
              ))}
            </ol>
          </div>

          {/* Config Path */}
          <div className="text-sm">
            <span className="font-semibold">Config Location: </span>
            <code className="bg-muted px-2 py-1 rounded text-xs">{app.configPath}</code>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {supportsAutomaticSetup && (
            <Button
              onClick={handleAutomaticSetup}
              disabled={setupInProgress}
            >
              <Zap className="h-4 w-4 mr-1" />
              {setupInProgress ? 'Setting up...' : 'Automatic Setup'}
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Manual Setup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
