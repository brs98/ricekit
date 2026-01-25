/**
 * Plugins CLI commands
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { listPlugins, getPluginStatus, installPlugin, getAvailablePlugins } from '../../core/plugins';
import { isJsonMode, output, success, error, table } from '../utils/output';
import type { CLIPluginsListOutput } from '../../core/interfaces';
import { EXIT_CODES } from '../../shared/constants';

/**
 * Create plugins command group
 */
export function createPluginsCommand(): Command {
  const plugins = new Command('plugins')
    .description('Manage plugins');

  // plugins list
  plugins
    .command('list')
    .alias('ls')
    .description('List all plugins and their status')
    .option('--installed', 'Show only installed plugins')
    .action(async (options) => {
      try {
        let pluginList = listPlugins();

        if (options.installed) {
          pluginList = pluginList.filter((p) => p.isInstalled);
        }

        if (isJsonMode()) {
          const jsonOutput: CLIPluginsListOutput = {
            plugins: pluginList.map((p) => ({
              name: p.name,
              isInstalled: p.isInstalled,
              hasConfig: p.hasConfig,
            })),
          };
          output(jsonOutput);
        } else {
          if (pluginList.length === 0) {
            console.log(chalk.gray('No plugins found'));
            return;
          }

          console.log(chalk.bold(`\n${pluginList.length} plugin${pluginList.length !== 1 ? 's' : ''} available:\n`));

          const rows = pluginList.map((p) => [
            p.displayName,
            p.isInstalled ? chalk.green('✔') : chalk.gray('—'),
            p.hasConfig ? chalk.green('✔') : chalk.gray('—'),
            p.version || '-',
            p.description.slice(0, 40),
          ]);

          table(['Name', 'Installed', 'Config', 'Version', 'Description'], rows);
          console.log();
        }
      } catch (err) {
        error('Failed to list plugins', err instanceof Error ? err.message : undefined);
        process.exit(EXIT_CODES.ERROR);
      }
    });

  // plugins status <name>
  plugins
    .command('status <name>')
    .description('Get status of a specific plugin')
    .action(async (name) => {
      try {
        const status = getPluginStatus(name);

        if (!status) {
          const available = getAvailablePlugins().join(', ');
          if (isJsonMode()) {
            output({ success: false, error: `Unknown plugin: ${name}. Available: ${available}` });
          } else {
            error(`Unknown plugin: ${name}`, `Available: ${available}`);
          }
          process.exit(EXIT_CODES.ERROR);
        }

        if (isJsonMode()) {
          output(status);
        } else {
          console.log(chalk.bold(`\n${status.displayName}\n`));
          console.log(`  Description:  ${status.description}`);
          console.log(`  Installed:    ${status.isInstalled ? chalk.green('Yes') : chalk.gray('No')}`);
          console.log(`  Has Config:   ${status.hasConfig ? chalk.green('Yes') : chalk.gray('No')}`);
          if (status.version) {
            console.log(`  Version:      ${status.version}`);
          }
          if (status.binaryPath) {
            console.log(`  Binary:       ${status.binaryPath}`);
          }
          console.log();
        }
      } catch (err) {
        error('Failed to get plugin status', err instanceof Error ? err.message : undefined);
        process.exit(EXIT_CODES.ERROR);
      }
    });

  // plugins install <name>
  plugins
    .command('install <name>')
    .description('Install a plugin via Homebrew')
    .action(async (name) => {
      try {
        const result = await installPlugin(name, isJsonMode() ? undefined : (msg) => console.log(chalk.gray(msg)));

        if (!result.success) {
          if (isJsonMode()) {
            output({ success: false, error: result.error.message });
          } else {
            error('Failed to install plugin', result.error.message);
          }
          process.exit(EXIT_CODES.ERROR);
        }

        if (isJsonMode()) {
          output({ success: true, plugin: name });
        } else {
          success(`Installed ${chalk.bold(name)}`);
          console.log(chalk.gray(`  Run: mactheme apps setup ${name}`));
        }
      } catch (err) {
        error('Failed to install plugin', err instanceof Error ? err.message : undefined);
        process.exit(EXIT_CODES.ERROR);
      }
    });

  return plugins;
}
