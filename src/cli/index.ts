#!/usr/bin/env node
/**
 * Ricekit CLI
 *
 * Command-line interface for managing macOS themes.
 */

import { Command } from 'commander';
import { APP_CONFIG, EXIT_CODES } from '../shared/constants';
import { setOutputFormat } from './utils/output';
import { logger } from './adapters/logger';

// Import commands
import { createThemeCommand } from './commands/theme';
import { createWallpaperCommand } from './commands/wallpaper';
import { createAppsCommand } from './commands/apps';
import { createConfigCommand } from './commands/config';
import { createStatusCommand, createDoctorCommand } from './commands/status';
import { createPluginsCommand } from './commands/plugins';
import { createCompletionsCommand } from './commands/completions';

// Read version from package.json (will be injected at build time)
const VERSION = process.env.npm_package_version || '1.0.0';

/**
 * Main CLI program
 */
const program = new Command()
  .name(APP_CONFIG.cliName)
  .description(`${APP_CONFIG.name} - Manage macOS themes from the command line`)
  .version(VERSION, '-v, --version', 'Show version number')
  .option('--json', 'Output in JSON format')
  .option('--quiet', 'Suppress non-essential output')
  .option('--verbose', 'Show debug information')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();

    // Set output format
    if (opts.json) {
      setOutputFormat('json');
    }

    // Set logger verbosity
    if (opts.verbose) {
      logger.setDebugEnabled(true);
    }
  });

// Register command groups
program.addCommand(createThemeCommand());
program.addCommand(createWallpaperCommand());
program.addCommand(createAppsCommand());
program.addCommand(createConfigCommand());
program.addCommand(createPluginsCommand());
program.addCommand(createStatusCommand());
program.addCommand(createDoctorCommand());
program.addCommand(createCompletionsCommand());

// Default action (no command) - show status
program.action(async () => {
  // If no command provided, show help
  program.help();
});

// Help-json command for skill generation
program
  .command('help-json', { hidden: true })
  .description('Output command schema as JSON')
  .action(() => {
    const commands = program.commands.map((cmd) => ({
      name: cmd.name(),
      description: cmd.description(),
      aliases: cmd.aliases(),
      options: cmd.options.map((opt) => ({
        flags: opt.flags,
        description: opt.description,
      })),
      subcommands: cmd.commands?.map((sub) => ({
        name: sub.name(),
        description: sub.description(),
        arguments: sub.registeredArguments?.map((arg) => ({
          name: arg.name(),
          required: arg.required,
          description: arg.description,
        })),
      })),
    }));

    console.log(JSON.stringify({
      name: APP_CONFIG.cliName,
      version: VERSION,
      description: program.description(),
      globalOptions: program.options.map((opt) => ({
        flags: opt.flags,
        description: opt.description,
      })),
      commands,
    }, null, 2));
  });

// Error handling
program.exitOverride((err) => {
  if (err.code === 'commander.helpDisplayed') {
    process.exit(EXIT_CODES.SUCCESS);
  }
  if (err.code === 'commander.version') {
    process.exit(EXIT_CODES.SUCCESS);
  }
  process.exit(EXIT_CODES.INVALID_ARGS);
});

// Parse arguments
program.parseAsync(process.argv).catch((err) => {
  logger.error('Fatal error:', err);
  process.exit(EXIT_CODES.ERROR);
});
