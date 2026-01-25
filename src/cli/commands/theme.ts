/**
 * Theme CLI commands
 */

import { Command } from 'commander';
import chalk from 'chalk';
import {
  listThemes,
  getTheme,
  getCurrentTheme,
  applyTheme,
  createTheme,
  deleteTheme,
  duplicateTheme,
  exportTheme,
  importTheme,
  importThemeFromUrl,
} from '../../core/theme';
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

  // theme create <name>
  theme
    .command('create <name>')
    .description('Create a new custom theme')
    .option('-a, --author <author>', 'Theme author')
    .option('-d, --description <desc>', 'Theme description')
    .option('-b, --base <theme>', 'Base theme to duplicate from')
    .action(async (name, options) => {
      try {
        const result = await createTheme(name, {
          author: options.author,
          description: options.description,
          baseTheme: options.base,
        });

        if (!result.success) {
          if (isJsonMode()) {
            output({ success: false, error: result.error.message });
          } else {
            error('Failed to create theme', result.error.message);
          }
          process.exit(EXIT_CODES.ERROR);
        }

        if (isJsonMode()) {
          output({
            success: true,
            name: result.data.name,
            path: result.data.path,
          });
        } else {
          success(`Created theme: ${chalk.bold(name)}`);
          console.log(chalk.gray(`  Path: ${result.data.path}`));
        }
      } catch (err) {
        error('Failed to create theme', err instanceof Error ? err.message : undefined);
        process.exit(EXIT_CODES.ERROR);
      }
    });

  // theme delete <name>
  theme
    .command('delete <name>')
    .alias('rm')
    .description('Delete a custom theme')
    .option('-f, --force', 'Skip confirmation')
    .action(async (name, options) => {
      try {
        // Confirm deletion unless --force
        if (!options.force && !isJsonMode()) {
          const readline = await import('readline');
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });

          const answer = await new Promise<string>((resolve) => {
            rl.question(chalk.yellow(`Delete theme "${name}"? [y/N] `), resolve);
          });
          rl.close();

          if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
            console.log(chalk.gray('Cancelled'));
            return;
          }
        }

        const result = await deleteTheme(name);

        if (!result.success) {
          if (isJsonMode()) {
            output({ success: false, error: result.error.message });
          } else {
            error('Failed to delete theme', result.error.message);
          }
          process.exit(EXIT_CODES.ERROR);
        }

        if (isJsonMode()) {
          output({ success: true, deleted: name });
        } else {
          success(`Deleted theme: ${chalk.bold(name)}`);
        }
      } catch (err) {
        error('Failed to delete theme', err instanceof Error ? err.message : undefined);
        process.exit(EXIT_CODES.ERROR);
      }
    });

  // theme duplicate <name> [new-name]
  theme
    .command('duplicate <name> [new-name]')
    .alias('dup')
    .description('Duplicate a theme')
    .action(async (name, newName) => {
      try {
        const result = await duplicateTheme(name, newName);

        if (!result.success) {
          if (isJsonMode()) {
            output({ success: false, error: result.error.message });
          } else {
            error('Failed to duplicate theme', result.error.message);
          }
          process.exit(EXIT_CODES.ERROR);
        }

        if (isJsonMode()) {
          output({
            success: true,
            source: name,
            name: result.data.name,
            path: result.data.path,
          });
        } else {
          success(`Duplicated theme: ${chalk.bold(name)} → ${chalk.bold(result.data.name)}`);
          console.log(chalk.gray(`  Path: ${result.data.path}`));
        }
      } catch (err) {
        error('Failed to duplicate theme', err instanceof Error ? err.message : undefined);
        process.exit(EXIT_CODES.ERROR);
      }
    });

  // theme export <name> [output-path]
  theme
    .command('export <name> [output-path]')
    .description('Export a theme to a zip file')
    .action(async (name, outputPath) => {
      try {
        const result = await exportTheme(name, outputPath);

        if (!result.success) {
          if (isJsonMode()) {
            output({ success: false, error: result.error.message });
          } else {
            error('Failed to export theme', result.error.message);
          }
          process.exit(EXIT_CODES.ERROR);
        }

        if (isJsonMode()) {
          output({
            success: true,
            theme: name,
            path: result.data,
          });
        } else {
          success(`Exported theme: ${chalk.bold(name)}`);
          console.log(chalk.gray(`  File: ${result.data}`));
        }
      } catch (err) {
        error('Failed to export theme', err instanceof Error ? err.message : undefined);
        process.exit(EXIT_CODES.ERROR);
      }
    });

  // theme import <path-or-url>
  theme
    .command('import <path-or-url>')
    .description('Import a theme from a file or URL')
    .action(async (pathOrUrl) => {
      try {
        // Check if it's a URL
        const isUrl = pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://');
        const result = isUrl
          ? await importThemeFromUrl(pathOrUrl)
          : await importTheme(pathOrUrl);

        if (!result.success) {
          if (isJsonMode()) {
            output({ success: false, error: result.error.message });
          } else {
            error('Failed to import theme', result.error.message);
          }
          process.exit(EXIT_CODES.ERROR);
        }

        if (isJsonMode()) {
          output({
            success: true,
            source: pathOrUrl,
            name: result.data.name,
            path: result.data.path,
          });
        } else {
          success(`Imported theme: ${chalk.bold(result.data.name)}`);
          console.log(chalk.gray(`  Path: ${result.data.path}`));
        }
      } catch (err) {
        error('Failed to import theme', err instanceof Error ? err.message : undefined);
        process.exit(EXIT_CODES.ERROR);
      }
    });

  return theme;
}
