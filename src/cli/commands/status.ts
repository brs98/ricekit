/**
 * Status CLI commands
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { listThemes, getCurrentTheme } from '../../core/theme';
import { getState } from '../../core/state';
import { getPreferences } from '../../core/preferences';
import { getInstalledApps, getConfiguredApps } from '../../core/apps';
import { getPathProvider } from '../../core/paths';
import { existsSync } from '../../core/utils/fs';
import { isJsonMode, output } from '../utils/output';
import type { CLIStatusOutput } from '../../core/interfaces';
import { EXIT_CODES, APP_CONFIG } from '../../shared/constants';

/**
 * Create status command
 */
export function createStatusCommand(): Command {
  const status = new Command('status')
    .description('Show overall status')
    .action(async () => {
      try {
        const themes = await listThemes();
        const currentTheme = await getCurrentTheme();
        const state = await getState();
        const prefs = await getPreferences();
        const installedApps = await getInstalledApps();
        const configuredApps = await getConfiguredApps();
        const paths = getPathProvider();

        const customThemes = themes.filter((t) => t.isCustom);

        if (isJsonMode()) {
          const jsonOutput: CLIStatusOutput = {
            currentTheme: state.currentTheme,
            currentWallpaper: state.currentWallpaper || null,
            installedApps: installedApps.map((a) => a.name),
            configuredApps: configuredApps.map((a) => a.name),
            themesCount: themes.length,
            customThemesCount: customThemes.length,
            preferencesPath: paths.getPreferencesPath(),
            dataDir: paths.getAppDataDir(),
          };
          output(jsonOutput);
        } else {
          console.log(chalk.bold(`\n${APP_CONFIG.name} Status\n`));

          // Current theme
          console.log(chalk.bold('Theme'));
          if (currentTheme) {
            console.log(`  Current:     ${chalk.green(currentTheme.name)}`);
            console.log(`  Type:        ${currentTheme.isLight ? 'Light ☀' : 'Dark'}`);
          } else {
            console.log(`  Current:     ${chalk.gray('None')}`);
          }

          // Wallpaper
          console.log();
          console.log(chalk.bold('Wallpaper'));
          if (state.currentWallpaper) {
            console.log(`  Current:     ${state.currentWallpaper}`);
          } else {
            console.log(`  Current:     ${chalk.gray('None')}`);
          }

          // Themes
          console.log();
          console.log(chalk.bold('Themes'));
          console.log(`  Total:       ${themes.length}`);
          console.log(`  Custom:      ${customThemes.length}`);
          console.log(`  Bundled:     ${themes.length - customThemes.length}`);

          // Apps
          console.log();
          console.log(chalk.bold('Applications'));
          console.log(`  Installed:   ${installedApps.length}`);
          console.log(`  Configured:  ${configuredApps.length}`);
          if (prefs.enabledApps.length > 0) {
            console.log(`  Enabled:     ${prefs.enabledApps.join(', ')}`);
          }

          // Schedule
          console.log();
          console.log(chalk.bold('Schedule'));
          console.log(`  Enabled:     ${prefs.schedule?.enabled ? 'Yes' : 'No'}`);
          if (prefs.schedule?.schedules && prefs.schedule.schedules.length > 0) {
            console.log(`  Entries:     ${prefs.schedule.schedules.length}`);
          }

          // Paths
          console.log();
          console.log(chalk.bold('Paths'));
          console.log(`  Data Dir:    ${paths.getAppDataDir()}`);
          console.log(`  Config:      ${paths.getPreferencesPath()}`);

          console.log();
        }
      } catch (err: unknown) {
        if (isJsonMode()) {
          output({ success: false, error: err instanceof Error ? err.message : String(err) });
        } else {
          console.error(chalk.red('Failed to get status:'), err instanceof Error ? err.message : err);
        }
        process.exit(EXIT_CODES.ERROR);
      }
    });

  return status;
}

/**
 * Create doctor command for diagnosing issues
 */
export function createDoctorCommand(): Command {
  const doctor = new Command('doctor')
    .description('Diagnose issues')
    .action(async () => {
      try {
        const paths = getPathProvider();
        const issues: string[] = [];
        const checks: { name: string; status: 'ok' | 'warn' | 'error'; message: string }[] = [];

        // Check data directory
        const dataDir = paths.getAppDataDir();
        if (existsSync(dataDir)) {
          checks.push({ name: 'Data directory', status: 'ok', message: dataDir });
        } else {
          checks.push({ name: 'Data directory', status: 'error', message: 'Not found' });
          issues.push('Data directory does not exist. Run the app once to create it.');
        }

        // Check themes directory
        const themesDir = paths.getThemesDir();
        if (existsSync(themesDir)) {
          const themes = await listThemes();
          checks.push({ name: 'Themes', status: 'ok', message: `${themes.length} themes found` });
        } else {
          checks.push({ name: 'Themes', status: 'error', message: 'Themes directory not found' });
          issues.push('Themes directory does not exist. Install themes first.');
        }

        // Check preferences
        const prefsPath = paths.getPreferencesPath();
        if (existsSync(prefsPath)) {
          checks.push({ name: 'Preferences', status: 'ok', message: prefsPath });
        } else {
          checks.push({ name: 'Preferences', status: 'warn', message: 'Using defaults' });
        }

        // Check state
        const statePath = paths.getStatePath();
        if (existsSync(statePath)) {
          const state = await getState();
          checks.push({ name: 'State', status: 'ok', message: `Current theme: ${state.currentTheme}` });
        } else {
          checks.push({ name: 'State', status: 'warn', message: 'No state file' });
        }

        // Check current symlink
        const currentDir = paths.getCurrentDir();
        const symlinkPath = `${currentDir}/theme`;
        if (existsSync(symlinkPath)) {
          checks.push({ name: 'Theme symlink', status: 'ok', message: 'Valid' });
        } else {
          checks.push({ name: 'Theme symlink', status: 'error', message: 'Missing or broken' });
          issues.push('Theme symlink is missing. Apply a theme to fix.');
        }

        if (isJsonMode()) {
          output({ checks, issues, healthy: issues.length === 0 });
        } else {
          console.log(chalk.bold('\nDiagnostics\n'));

          for (const check of checks) {
            const icon = check.status === 'ok' ? chalk.green('✔') :
                        check.status === 'warn' ? chalk.yellow('⚠') :
                        chalk.red('✖');
            console.log(`  ${icon} ${check.name}: ${check.message}`);
          }

          if (issues.length > 0) {
            console.log(chalk.bold('\nIssues Found:\n'));
            issues.forEach((issue, i) => {
              console.log(`  ${chalk.red(`${i + 1}.`)} ${issue}`);
            });
          } else {
            console.log(chalk.green('\n✔ Everything looks good!\n'));
          }
        }
      } catch (err: unknown) {
        if (isJsonMode()) {
          output({ success: false, error: err instanceof Error ? err.message : String(err) });
        } else {
          console.error(chalk.red('Diagnostics failed:'), err instanceof Error ? err.message : err);
        }
        process.exit(EXIT_CODES.ERROR);
      }
    });

  return doctor;
}
