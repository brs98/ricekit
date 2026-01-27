/**
 * Apps CLI commands
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { detectApps, getInstalledApps, getConfiguredApps, setupApp, getSetupableApps } from '../../core/apps';
import { isJsonMode, output, success, error, table } from '../utils/output';
import type { CLIAppsListOutput } from '../../core/interfaces';
import { EXIT_CODES } from '../../shared/constants';

/**
 * Create apps command group
 */
export function createAppsCommand(): Command {
  const apps = new Command('apps')
    .description('Manage application integrations');

  // apps list
  apps
    .command('list')
    .alias('ls')
    .description('List detected applications')
    .option('--installed', 'Show only installed apps')
    .option('--configured', 'Show only configured apps')
    .action(async (options) => {
      try {
        let appList = detectApps();

        if (options.installed) {
          appList = appList.filter((a) => a.isInstalled);
        }
        if (options.configured) {
          appList = appList.filter((a) => a.isConfigured);
        }

        if (isJsonMode()) {
          const jsonOutput: CLIAppsListOutput = {
            apps: appList.map((a) => ({
              name: a.name,
              displayName: a.displayName,
              category: a.category,
              isInstalled: a.isInstalled,
              isConfigured: a.isConfigured,
            })),
          };
          output(jsonOutput);
        } else {
          if (appList.length === 0) {
            console.log(chalk.gray('No applications found'));
            return;
          }

          console.log(chalk.bold(`\nDetected ${appList.length} application${appList.length !== 1 ? 's' : ''}:\n`));

          const rows = appList.map((a) => [
            a.displayName,
            a.category,
            a.isInstalled ? chalk.green('✔') : chalk.gray('—'),
            a.isConfigured ? chalk.green('✔') : chalk.gray('—'),
          ]);

          table(['Name', 'Category', 'Installed', 'Configured'], rows);
          console.log();
        }
      } catch (err) {
        if (isJsonMode()) {
          output({ success: false, error: err instanceof Error ? err.message : String(err) });
        } else {
          console.error(chalk.red('Failed to list apps:'), err instanceof Error ? err.message : err);
        }
        process.exit(EXIT_CODES.ERROR);
      }
    });

  // apps setup <app>
  apps
    .command('setup <app>')
    .description('Configure an app for theming')
    .action(async (appName) => {
      try {
        const result = await setupApp(appName);

        if (!result.success) {
          if (isJsonMode()) {
            output({ success: false, error: result.error.message });
          } else {
            error('Failed to setup app', result.error.message);
          }
          process.exit(EXIT_CODES.ERROR);
        }

        if (isJsonMode()) {
          output({
            success: true,
            app: appName,
            configPath: result.data.configPath,
            backupPath: result.data.backupPath,
          });
        } else {
          success(`Configured ${chalk.bold(appName)} for theming`);
          console.log(chalk.gray(`  Config: ${result.data.configPath}`));
          if (result.data.backupPath) {
            console.log(chalk.gray(`  Backup: ${result.data.backupPath}`));
          }
        }
      } catch (err) {
        error('Failed to setup app', err instanceof Error ? err.message : undefined);
        process.exit(EXIT_CODES.ERROR);
      }
    });

  // apps supported
  apps
    .command('supported')
    .description('List apps that can be set up')
    .action(() => {
      const supportedApps = getSetupableApps();

      if (isJsonMode()) {
        output({ apps: supportedApps });
      } else {
        console.log(chalk.bold('\nApps that can be set up:\n'));
        supportedApps.forEach((app) => {
          console.log(`  • ${app}`);
        });
        console.log(chalk.gray('\nUse: flowstate apps setup <app>'));
        console.log();
      }
    });

  return apps;
}
