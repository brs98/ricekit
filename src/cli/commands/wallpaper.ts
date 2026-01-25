/**
 * Wallpaper CLI commands
 */

import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import { listWallpapers, applyWallpaper, getCurrentWallpaper } from '../../core/wallpaper';
import { getCurrentThemeName } from '../../core/state';
import { isJsonMode, output, success, error } from '../utils/output';
import type { CLIWallpaperListOutput } from '../../core/interfaces';
import { EXIT_CODES } from '../../shared/constants';

/**
 * Create wallpaper command group
 */
export function createWallpaperCommand(): Command {
  const wallpaper = new Command('wallpaper')
    .alias('wp')
    .description('Manage wallpapers');

  // wallpaper list [theme]
  wallpaper
    .command('list [theme]')
    .alias('ls')
    .description('List wallpapers for a theme (defaults to current theme)')
    .action(async (themeName?: string) => {
      try {
        const theme = themeName || await getCurrentThemeName();

        if (!theme) {
          error('No theme specified and no current theme set');
          process.exit(EXIT_CODES.ERROR);
        }

        const wallpapers = await listWallpapers(theme);

        if (isJsonMode()) {
          const jsonOutput: CLIWallpaperListOutput = {
            wallpapers: wallpapers.map((p) => ({
              path: p,
              filename: path.basename(p),
            })),
            themeName: theme,
          };
          output(jsonOutput);
        } else {
          if (wallpapers.length === 0) {
            console.log(chalk.gray(`No wallpapers found for theme "${theme}"`));
            return;
          }

          console.log(chalk.bold(`\nWallpapers for "${theme}":\n`));
          wallpapers.forEach((wp, i) => {
            console.log(`  ${chalk.gray(`${i + 1}.`)} ${path.basename(wp)}`);
            console.log(chalk.gray(`     ${wp}`));
          });
          console.log();
        }
      } catch (err) {
        error('Failed to list wallpapers', err instanceof Error ? err.message : undefined);
        process.exit(EXIT_CODES.ERROR);
      }
    });

  // wallpaper current
  wallpaper
    .command('current')
    .description('Show current wallpaper')
    .action(async () => {
      try {
        const current = await getCurrentWallpaper();

        if (isJsonMode()) {
          output({ path: current, filename: current ? path.basename(current) : null });
        } else {
          if (current) {
            console.log(chalk.bold('Current wallpaper:'), path.basename(current));
            console.log(chalk.gray(`  ${current}`));
          } else {
            console.log(chalk.gray('No wallpaper currently set'));
          }
        }
      } catch (err) {
        error('Failed to get current wallpaper', err instanceof Error ? err.message : undefined);
        process.exit(EXIT_CODES.ERROR);
      }
    });

  // wallpaper apply <path>
  wallpaper
    .command('apply <path>')
    .description('Apply a wallpaper')
    .option('-d, --display <index>', 'Apply to specific display (1-indexed)')
    .action(async (wallpaperPath, options) => {
      try {
        const displayIndex = options.display ? parseInt(options.display, 10) : undefined;

        await applyWallpaper(wallpaperPath, displayIndex);

        if (isJsonMode()) {
          output({
            success: true,
            path: wallpaperPath,
            filename: path.basename(wallpaperPath),
            display: displayIndex || 'all',
          });
        } else {
          success(`Applied wallpaper: ${chalk.bold(path.basename(wallpaperPath))}`);
          if (displayIndex) {
            console.log(chalk.gray(`  Applied to display ${displayIndex}`));
          }
        }
      } catch (err) {
        if (isJsonMode()) {
          output({
            success: false,
            error: err instanceof Error ? err.message : String(err),
          });
        } else {
          error('Failed to apply wallpaper', err instanceof Error ? err.message : undefined);
        }
        process.exit(EXIT_CODES.ERROR);
      }
    });

  return wallpaper;
}
