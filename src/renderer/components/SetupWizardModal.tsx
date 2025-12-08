import { useState } from 'react';
import type { AppInfo } from '../../shared/types';

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
    const basePath = '~/Library/Application Support/MacTheme/current/theme';

    switch (app.name) {
      case 'alacritty':
        return `import = ["${basePath}/alacritty.toml"]`;

      case 'kitty':
        return `include ${basePath}/kitty.conf`;

      case 'iterm2':
        return 'iTerm2 uses .itermcolors files. Load via Preferences → Profiles → Colors → Color Presets → Import';

      case 'warp':
        return `# Add to ~/.warp/themes/\ncp "${basePath}/warp.yaml" ~/.warp/themes/mactheme.yaml`;

      case 'hyper':
        return `# Add to ~/.hyper.js config section\ncolors: require('${basePath}/hyper.js')`;

      case 'wezterm':
        return `-- MacTheme WezTerm integration
local mactheme_colors = wezterm.home_dir .. "/Library/Application Support/MacTheme/wezterm-colors.lua"
wezterm.add_to_config_reload_watch_list(mactheme_colors)
config.colors = dofile(mactheme_colors)`;

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

# Or source from MacTheme:
source "${basePath}/sketchybar-colors.sh"`;

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
          'MacTheme will modify your settings.json',
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
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleAutomaticSetup = async () => {
    try {
      setSetupInProgress(true);
      // Call IPC handler to automatically configure the app
      await window.electronAPI.setupApp(app.name);
      onSetupComplete();
    } catch (error) {
      console.error('Setup failed:', error);
      alert('Automatic setup failed. Please follow manual instructions.');
    } finally {
      setSetupInProgress(false);
    }
  };

  const importStatement = getImportStatement();
  const instructions = getSetupInstructions();
  const supportsAutomaticSetup = ['alacritty', 'kitty', 'neovim', 'vscode', 'starship', 'wezterm', 'sketchybar'].includes(app.name);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content setup-wizard-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Setup {app.displayName}</h2>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="setup-wizard-content">
            <p className="wizard-intro">
              To use MacTheme with {app.displayName}, you need to configure it to import
              theme settings from MacTheme's current theme directory.
            </p>

            <div className="import-statement-section">
              <h3>Import Statement</h3>
              <div className="code-block">
                <pre><code>{importStatement}</code></pre>
                <button
                  className={`copy-button ${copied ? 'copied' : ''}`}
                  onClick={handleCopy}
                  title="Copy to clipboard"
                >
                  {copied ? '✓ Copied!' : '📋 Copy'}
                </button>
              </div>
            </div>

            <div className="instructions-section">
              <h3>Setup Instructions</h3>
              <ol className="instruction-list">
                {instructions.map((instruction, index) => (
                  <li key={index}>{instruction}</li>
                ))}
              </ol>
            </div>

            <div className="config-path-info">
              <strong>Config Location:</strong> <code>{app.configPath}</code>
            </div>
          </div>
        </div>

        <div className="modal-actions setup-wizard-actions">
          {supportsAutomaticSetup && (
            <button
              className="primary-button"
              onClick={handleAutomaticSetup}
              disabled={setupInProgress}
            >
              {setupInProgress ? 'Setting up...' : '⚡ Automatic Setup'}
            </button>
          )}
          <button className="secondary-button" onClick={onClose}>
            Manual Setup
          </button>
        </div>
      </div>
    </div>
  );
}
