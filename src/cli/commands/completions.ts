/**
 * Shell completions CLI command
 */

import { Command } from 'commander';
import { APP_CONFIG } from '../../shared/constants';

/**
 * Generate bash completion script
 */
function generateBashCompletion(): string {
  const cli = APP_CONFIG.cliName;
  return `# ${APP_CONFIG.name} bash completion
# Add to ~/.bashrc or ~/.bash_profile:
#   source <(${cli} completions bash)
# Or save to a file:
#   ${cli} completions bash > /usr/local/etc/bash_completion.d/${cli}

_${cli}_completions() {
    local cur prev words cword
    _init_completion || return

    local commands="theme wallpaper apps config plugins status doctor help-json completions"
    local theme_cmds="list ls current apply get create delete rm duplicate dup export import"
    local wallpaper_cmds="list ls current apply"
    local apps_cmds="list ls setup supported"
    local config_cmds="show set get"
    local plugins_cmds="list ls status install"
    local completions_cmds="bash zsh fish"

    case "\${cword}" in
        1)
            COMPREPLY=( $(compgen -W "\${commands}" -- "\${cur}") )
            ;;
        2)
            case "\${prev}" in
                theme)
                    COMPREPLY=( $(compgen -W "\${theme_cmds}" -- "\${cur}") )
                    ;;
                wallpaper|wp)
                    COMPREPLY=( $(compgen -W "\${wallpaper_cmds}" -- "\${cur}") )
                    ;;
                apps)
                    COMPREPLY=( $(compgen -W "\${apps_cmds}" -- "\${cur}") )
                    ;;
                config)
                    COMPREPLY=( $(compgen -W "\${config_cmds}" -- "\${cur}") )
                    ;;
                plugins)
                    COMPREPLY=( $(compgen -W "\${plugins_cmds}" -- "\${cur}") )
                    ;;
                completions)
                    COMPREPLY=( $(compgen -W "\${completions_cmds}" -- "\${cur}") )
                    ;;
            esac
            ;;
        *)
            # For theme names, we could call the CLI to get the list
            # but for simplicity, we'll just do file completion
            COMPREPLY=()
            ;;
    esac
}

complete -F _${cli}_completions ${cli}
`;
}

/**
 * Generate zsh completion script
 */
function generateZshCompletion(): string {
  const cli = APP_CONFIG.cliName;
  return `#compdef ${cli}
# ${APP_CONFIG.name} zsh completion
# Add to ~/.zshrc:
#   source <(${cli} completions zsh)
# Or save to fpath:
#   ${cli} completions zsh > ~/.zsh/completions/_${cli}

_${cli}() {
    local -a commands
    commands=(
        'theme:Manage themes'
        'wallpaper:Manage wallpapers'
        'apps:Manage application integrations'
        'config:Manage preferences'
        'plugins:Manage plugins'
        'status:Show overall status'
        'doctor:Diagnose issues'
        'completions:Generate shell completions'
    )

    local -a theme_cmds
    theme_cmds=(
        'list:List all themes'
        'current:Show current theme'
        'apply:Apply a theme'
        'get:Get theme details'
        'create:Create a new theme'
        'delete:Delete a custom theme'
        'duplicate:Duplicate a theme'
        'export:Export a theme'
        'import:Import a theme'
    )

    local -a wallpaper_cmds
    wallpaper_cmds=(
        'list:List wallpapers'
        'current:Show current wallpaper'
        'apply:Apply a wallpaper'
    )

    local -a apps_cmds
    apps_cmds=(
        'list:List detected apps'
        'setup:Configure an app'
        'supported:List apps that can be set up'
    )

    local -a config_cmds
    config_cmds=(
        'show:Show preferences'
        'set:Set a preference'
        'get:Get a preference'
    )

    local -a plugins_cmds
    plugins_cmds=(
        'list:List plugins'
        'status:Get plugin status'
        'install:Install a plugin'
    )

    _arguments -C \\
        '--json[Output in JSON format]' \\
        '--quiet[Suppress non-essential output]' \\
        '--verbose[Show debug information]' \\
        '-v[Show version]' \\
        '--version[Show version]' \\
        '-h[Show help]' \\
        '--help[Show help]' \\
        '1: :->command' \\
        '2: :->subcommand' \\
        '*::arg:->args'

    case "\$state" in
        command)
            _describe -t commands 'command' commands
            ;;
        subcommand)
            case "\$words[2]" in
                theme)
                    _describe -t theme_cmds 'theme command' theme_cmds
                    ;;
                wallpaper|wp)
                    _describe -t wallpaper_cmds 'wallpaper command' wallpaper_cmds
                    ;;
                apps)
                    _describe -t apps_cmds 'apps command' apps_cmds
                    ;;
                config)
                    _describe -t config_cmds 'config command' config_cmds
                    ;;
                plugins)
                    _describe -t plugins_cmds 'plugins command' plugins_cmds
                    ;;
            esac
            ;;
    esac
}

_${cli} "\$@"
`;
}

/**
 * Generate fish completion script
 */
function generateFishCompletion(): string {
  const cli = APP_CONFIG.cliName;
  return `# ${APP_CONFIG.name} fish completion
# Save to ~/.config/fish/completions/${cli}.fish
# Or: ${cli} completions fish > ~/.config/fish/completions/${cli}.fish

# Disable file completion by default
complete -c ${cli} -f

# Global options
complete -c ${cli} -l json -d 'Output in JSON format'
complete -c ${cli} -l quiet -d 'Suppress non-essential output'
complete -c ${cli} -l verbose -d 'Show debug information'
complete -c ${cli} -s v -l version -d 'Show version'
complete -c ${cli} -s h -l help -d 'Show help'

# Commands
complete -c ${cli} -n __fish_use_subcommand -a theme -d 'Manage themes'
complete -c ${cli} -n __fish_use_subcommand -a wallpaper -d 'Manage wallpapers'
complete -c ${cli} -n __fish_use_subcommand -a wp -d 'Manage wallpapers (alias)'
complete -c ${cli} -n __fish_use_subcommand -a apps -d 'Manage application integrations'
complete -c ${cli} -n __fish_use_subcommand -a config -d 'Manage preferences'
complete -c ${cli} -n __fish_use_subcommand -a plugins -d 'Manage plugins'
complete -c ${cli} -n __fish_use_subcommand -a status -d 'Show overall status'
complete -c ${cli} -n __fish_use_subcommand -a doctor -d 'Diagnose issues'
complete -c ${cli} -n __fish_use_subcommand -a completions -d 'Generate shell completions'

# Theme subcommands
complete -c ${cli} -n '__fish_seen_subcommand_from theme' -a list -d 'List all themes'
complete -c ${cli} -n '__fish_seen_subcommand_from theme' -a ls -d 'List all themes'
complete -c ${cli} -n '__fish_seen_subcommand_from theme' -a current -d 'Show current theme'
complete -c ${cli} -n '__fish_seen_subcommand_from theme' -a apply -d 'Apply a theme'
complete -c ${cli} -n '__fish_seen_subcommand_from theme' -a get -d 'Get theme details'
complete -c ${cli} -n '__fish_seen_subcommand_from theme' -a create -d 'Create a new theme'
complete -c ${cli} -n '__fish_seen_subcommand_from theme' -a delete -d 'Delete a custom theme'
complete -c ${cli} -n '__fish_seen_subcommand_from theme' -a rm -d 'Delete a custom theme'
complete -c ${cli} -n '__fish_seen_subcommand_from theme' -a duplicate -d 'Duplicate a theme'
complete -c ${cli} -n '__fish_seen_subcommand_from theme' -a dup -d 'Duplicate a theme'
complete -c ${cli} -n '__fish_seen_subcommand_from theme' -a export -d 'Export a theme'
complete -c ${cli} -n '__fish_seen_subcommand_from theme' -a import -d 'Import a theme'

# Wallpaper subcommands
complete -c ${cli} -n '__fish_seen_subcommand_from wallpaper wp' -a list -d 'List wallpapers'
complete -c ${cli} -n '__fish_seen_subcommand_from wallpaper wp' -a ls -d 'List wallpapers'
complete -c ${cli} -n '__fish_seen_subcommand_from wallpaper wp' -a current -d 'Show current wallpaper'
complete -c ${cli} -n '__fish_seen_subcommand_from wallpaper wp' -a apply -d 'Apply a wallpaper'

# Apps subcommands
complete -c ${cli} -n '__fish_seen_subcommand_from apps' -a list -d 'List detected apps'
complete -c ${cli} -n '__fish_seen_subcommand_from apps' -a ls -d 'List detected apps'
complete -c ${cli} -n '__fish_seen_subcommand_from apps' -a setup -d 'Configure an app'
complete -c ${cli} -n '__fish_seen_subcommand_from apps' -a supported -d 'List apps that can be set up'

# Config subcommands
complete -c ${cli} -n '__fish_seen_subcommand_from config' -a show -d 'Show preferences'
complete -c ${cli} -n '__fish_seen_subcommand_from config' -a set -d 'Set a preference'
complete -c ${cli} -n '__fish_seen_subcommand_from config' -a get -d 'Get a preference'

# Plugins subcommands
complete -c ${cli} -n '__fish_seen_subcommand_from plugins' -a list -d 'List plugins'
complete -c ${cli} -n '__fish_seen_subcommand_from plugins' -a ls -d 'List plugins'
complete -c ${cli} -n '__fish_seen_subcommand_from plugins' -a status -d 'Get plugin status'
complete -c ${cli} -n '__fish_seen_subcommand_from plugins' -a install -d 'Install a plugin'

# Completions subcommands
complete -c ${cli} -n '__fish_seen_subcommand_from completions' -a bash -d 'Generate bash completions'
complete -c ${cli} -n '__fish_seen_subcommand_from completions' -a zsh -d 'Generate zsh completions'
complete -c ${cli} -n '__fish_seen_subcommand_from completions' -a fish -d 'Generate fish completions'
`;
}

/**
 * Create completions command
 */
export function createCompletionsCommand(): Command {
  const completions = new Command('completions')
    .description('Generate shell completions');

  completions
    .command('bash')
    .description('Generate bash completion script')
    .action(() => {
      console.log(generateBashCompletion());
    });

  completions
    .command('zsh')
    .description('Generate zsh completion script')
    .action(() => {
      console.log(generateZshCompletion());
    });

  completions
    .command('fish')
    .description('Generate fish completion script')
    .action(() => {
      console.log(generateFishCompletion());
    });

  return completions;
}
