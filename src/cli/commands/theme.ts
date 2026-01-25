/**
 * Theme CLI commands
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { listThemes, getTheme, getCurrentTheme, applyTheme } from '../../core/theme';
import { getCurrentThemeName } from '../../core/state';
import { isJsonMode, output, success, error, table, formatThemeName } from '../utils/output';
import type { CLIThemeListOutput, CLIThemeApplyOutput } from '../../core/interfaces';
import { EXIT_CODES } from '../../shared/constants';

/**
 * Create theme command group
 */
export function createThemeCommand(): Command {
  const theme = new Command('theme')
    .description('Manage themes');

  // theme list
  theme
    .command('list')
    .alias('ls')
    .description('List all available themes')
    .option('--light', 'Show only light themes')
    .option('--dark', 'Show only dark themes')
    .option('--custom', 'Show only custom themes')
    .action(async (options) => {
      try {
        const themes = await listThemes();
        const currentThemeName = await getCurrentThemeName();

        // Filter themes
        let filtered = themes;
        if (options.light) {
          filtered = filtered.filter((t) => t.isLight);
        }
        if (options.dark) {
          filtered = filtered.filter((t) => !t.isLight);
        }
        if (options.custom) {
          filtered = filtered.filter((t) => t.isCustom);
        }

        if (isJsonMode()) {
          const jsonOutput: CLIThemeListOutput = {
            themes: filtered.map((t) => ({
              name: t.name,
              isCustom: t.isCustom,
              isLight: t.isLight,
              isCurrent: t.name === currentThemeName,
              author: t.metadata.author,
              description: t.metadata.description,
            })),
          };
          output(jsonOutput);
        } else {
          if (filtered.length === 0) {
            console.log(chalk.gray('No themes found'));
            return;
          }

          console.log(chalk.bold(`\nFound ${filtered.length} theme${filtered.length !== 1 ? 's' : ''}:\n`));

          const rows = filtered.map((t) => [
            formatThemeName(t.name, {
              isCurrent: t.name === currentThemeName,
              isCustom: t.isCustom,
              isLight: t.isLight,
            }),
            t.metadata.author || '-',
            t.metadata.description?.slice(0, 40) || '-',
          ]);

          table(['Name', 'Author', 'Description'], rows);
          console.log();
        }
      } catch (err) {
        error('Failed to list themes', err instanceof Error ? err.message : undefined);
        process.exit(EXIT_CODES.ERROR);
      }
    });

  // theme current
  theme
    .command('current')
    .description('Show current theme')
    .action(async () => {
      try {
        const current = await getCurrentTheme();

        if (isJsonMode()) {
          if (current) {
            output({
              name: current.name,
              isCustom: current.isCustom,
              isLight: current.isLight,
              author: current.metadata.author,
              description: current.metadata.description,
            });
          } else {
            output({ name: null });
          }
        } else {
          if (current) {
            console.log(chalk.bold('Current theme:'), chalk.green(current.name));
            console.log(chalk.gray(`  Author: ${current.metadata.author || 'Unknown'}`));
            console.log(chalk.gray(`  Type: ${current.isLight ? 'Light' : 'Dark'}${current.isCustom ? ' (Custom)' : ''}`));
          } else {
            console.log(chalk.gray('No theme currently active'));
          }
        }
      } catch (err) {
        error('Failed to get current theme', err instanceof Error ? err.message : undefined);
        process.exit(EXIT_CODES.ERROR);
      }
    });

  // theme apply <name>
  theme
    .command('apply <name>')
    .description('Apply a theme')
    .option('--no-notify', 'Skip terminal reload notifications')
    .action(async (name, options) => {
      try {
        const previousTheme = await getCurrentThemeName();

        const result = await applyTheme(name, {
          skipNotify: !options.notify,
          onLog: isJsonMode() ? undefined : (msg) => console.log(chalk.gray(msg)),
        });

        if (!result.success) {
          if (isJsonMode()) {
            const jsonOutput: CLIThemeApplyOutput = {
              success: false,
              previousTheme: previousTheme || '',
              currentTheme: name,
              notifiedApps: [],
              error: result.error.message,
            };
            output(jsonOutput);
          } else {
            error('Failed to apply theme', result.error.message);
          }
          process.exit(EXIT_CODES.ERROR);
        }

        if (isJsonMode()) {
          const jsonOutput: CLIThemeApplyOutput = {
            success: true,
            previousTheme: result.data.previousTheme || '',
            currentTheme: result.data.currentTheme,
            notifiedApps: result.data.notifiedApps,
          };
          output(jsonOutput);
        } else {
          success(`Applied theme: ${chalk.bold(name)}`);
          if (result.data.notifiedApps.length > 0) {
            console.log(chalk.gray(`  Notified: ${result.data.notifiedApps.join(', ')}`));
          }
        }
      } catch (err) {
        error('Failed to apply theme', err instanceof Error ? err.message : undefined);
        process.exit(EXIT_CODES.ERROR);
      }
    });

  // theme get <name>
  theme
    .command('get <name>')
    .description('Get details about a specific theme')
    .action(async (name) => {
      try {
        const themeData = await getTheme(name);

        if (!themeData) {
          if (isJsonMode()) {
            output({ error: `Theme "${name}" not found` });
          } else {
            error(`Theme "${name}" not found`);
          }
          process.exit(EXIT_CODES.ERROR);
        }

        if (isJsonMode()) {
          output({
            name: themeData.name,
            path: themeData.path,
            isCustom: themeData.isCustom,
            isLight: themeData.isLight,
            metadata: themeData.metadata,
          });
        } else {
          console.log(chalk.bold(`\nTheme: ${themeData.name}\n`));
          console.log(`  Path:        ${themeData.path}`);
          console.log(`  Author:      ${themeData.metadata.author || 'Unknown'}`);
          console.log(`  Version:     ${themeData.metadata.version || '1.0.0'}`);
          console.log(`  Type:        ${themeData.isLight ? 'Light' : 'Dark'}`);
          console.log(`  Custom:      ${themeData.isCustom ? 'Yes' : 'No'}`);
          console.log(`  Description: ${themeData.metadata.description || 'No description'}`);
          console.log();

          // Show colors
          const colors = themeData.metadata.colors;
          console.log('  Colors:');
          console.log(`    Background: ${chalk.hex(colors.background || '#000')(colors.background)}`);
          console.log(`    Foreground: ${chalk.hex(colors.foreground || '#fff')(colors.foreground)}`);
          console.log(`    Accent:     ${chalk.hex(colors.accent || '#007acc')(colors.accent)}`);
          console.log();
        }
      } catch (err) {
        error('Failed to get theme', err instanceof Error ? err.message : undefined);
        process.exit(EXIT_CODES.ERROR);
      }
    });

  return theme;
}
