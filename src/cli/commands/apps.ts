/**
 * Apps CLI commands
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { detectApps, getInstalledApps, getConfiguredApps, setupApp, getSetupableApps } from '../../core/apps';
import type { SetupResult } from '../../core/apps';
import { getPreferences, savePreferences } from '../../core/preferences';
import { isJsonMode, output, success, error, table, info, warn } from '../utils/output';
import type { CLIAppsListOutput } from '../../core/interfaces';
import { EXIT_CODES } from '../../shared/constants';

/**
 * Add an app to enabledApps in preferences
 */
async function addToEnabledApps(appName: string): Promise<void> {
  const prefs = await getPreferences();
  if (!prefs.enabledApps) {
    prefs.enabledApps = [];
  }
  if (!prefs.enabledApps.includes(appName)) {
    prefs.enabledApps.push(appName);
    await savePreferences(prefs);
  }
}

/**
 * Remove an app from enabledApps in preferences
 */
async function removeFromEnabledApps(appName: string): Promise<void> {
  const prefs = await getPreferences();
  if (prefs.enabledApps) {
    prefs.enabledApps = prefs.enabledApps.filter(a => a !== appName);
    await savePreferences(prefs);
  }
}

/**
 * Copy text to clipboard using pbcopy (macOS)
 */
function copyToClipboard(text: string): boolean {
  try {
    execSync('pbcopy', { input: text });
    return true;
  } catch {
    return false;
  }
}

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
        let appList = await detectApps();

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
              hasRicekitIntegration: a.hasRicekitIntegration,
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
            a.isInstalled ? chalk.green('Y') : chalk.gray('-'),
            a.isConfigured ? chalk.green('Y') : chalk.gray('-'),
          ]);

          table(['Name', 'Category', 'Installed', 'Configured'], rows);
          console.log();
        }
      } catch (err: unknown) {
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
    .option('--no-auto-refresh', 'Skip prompt for auto-refresh on theme changes')
    .action(async (appName, options) => {
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

        const setupResult: SetupResult = result.data;

        if (isJsonMode()) {
          output({
            success: true,
            app: appName,
            action: setupResult.action,
            configPath: setupResult.configPath,
            snippet: setupResult.snippet,
            instructions: setupResult.instructions,
            message: setupResult.message,
          });
          return;
        }

        // Handle each action type
        switch (setupResult.action) {
          case 'created':
            success(`Created ${chalk.bold(appName)} config`);
            console.log(chalk.gray(`  ${setupResult.configPath}`));
            break;

          case 'clipboard':
            // Copy snippet to clipboard
            if (setupResult.snippet && copyToClipboard(setupResult.snippet)) {
              success(`Snippet copied to clipboard`);
            } else {
              warn('Could not copy to clipboard');
            }

            // Show instructions and snippet
            console.log();
            console.log(chalk.blue(setupResult.instructions));
            console.log();
            console.log(chalk.gray('─'.repeat(50)));
            console.log(chalk.white(setupResult.snippet));
            console.log(chalk.gray('─'.repeat(50)));
            console.log();
            console.log(chalk.gray(`Config file: ${setupResult.configPath}`));
            break;

          case 'already_setup':
            info(`${chalk.bold(appName)} is already configured with Ricekit`);
            console.log(chalk.gray(`  ${setupResult.configPath}`));
            break;
        }

        // Ask about auto-refresh for applicable apps
        if (setupResult.action === 'created' || setupResult.action === 'clipboard') {
          if (options.autoRefresh !== false) {
            // For non-interactive mode, we can't prompt - just add to enabledApps
            // In a real CLI, we'd use inquirer or similar for interactive prompts
            await addToEnabledApps(appName);
            console.log(chalk.gray(`  Added to auto-refresh apps`));
          }
        }

      } catch (err: unknown) {
        error('Failed to setup app', err instanceof Error ? err.message : undefined);
        process.exit(EXIT_CODES.ERROR);
      }
    });

  // apps unsetup <app>
  apps
    .command('unsetup <app>')
    .description('Remove an app from auto-refresh (does not delete config)')
    .action(async (appName) => {
      try {
        await removeFromEnabledApps(appName);

        if (isJsonMode()) {
          output({
            success: true,
            app: appName,
            message: `Removed ${appName} from auto-refresh`,
          });
        } else {
          success(`Removed ${chalk.bold(appName)} from auto-refresh`);
          console.log(chalk.gray('  Your config file was not modified'));
          console.log(chalk.gray('  To fully remove Ricekit integration, manually edit your config'));
        }
      } catch (err: unknown) {
        error('Failed to unsetup app', err instanceof Error ? err.message : undefined);
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
          console.log(`  ${app}`);
        });
        console.log(chalk.gray('\nUse: ricekit apps setup <app>'));
        console.log();
      }
    });

  // apps enabled
  apps
    .command('enabled')
    .description('List apps enabled for auto-refresh')
    .action(async () => {
      try {
        const prefs = await getPreferences();
        const enabledApps = prefs.enabledApps || [];

        if (isJsonMode()) {
          output({ enabledApps });
        } else {
          if (enabledApps.length === 0) {
            console.log(chalk.gray('\nNo apps enabled for auto-refresh'));
            console.log(chalk.gray('Use: ricekit apps setup <app>'));
          } else {
            console.log(chalk.bold('\nApps enabled for auto-refresh:\n'));
            enabledApps.forEach((app) => {
              console.log(`  ${app}`);
            });
          }
          console.log();
        }
      } catch (err: unknown) {
        error('Failed to list enabled apps', err instanceof Error ? err.message : undefined);
        process.exit(EXIT_CODES.ERROR);
      }
    });

  return apps;
}
