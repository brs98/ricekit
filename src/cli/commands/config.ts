/**
 * Config CLI commands
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getPreferences, updatePreferences } from '../../core/preferences';
import { isJsonMode, output, success, error } from '../utils/output';
import { EXIT_CODES } from '../../shared/constants';

/**
 * Create config command group
 */
export function createConfigCommand(): Command {
  const config = new Command('config')
    .description('Manage preferences');

  // config show
  config
    .command('show')
    .description('Show current preferences')
    .action(async () => {
      try {
        const prefs = await getPreferences();

        if (isJsonMode()) {
          output(prefs);
        } else {
          console.log(chalk.bold('\nPreferences:\n'));
          console.log(`  Enabled Apps:      ${prefs.enabledApps.join(', ') || 'None'}`);
          console.log(`  Favorites:         ${prefs.favorites.join(', ') || 'None'}`);
          console.log(`  Recent Themes:     ${prefs.recentThemes.slice(0, 5).join(', ') || 'None'}`);
          console.log(`  Start at Login:    ${prefs.startAtLogin ? 'Yes' : 'No'}`);
          console.log(`  Show in Menu Bar:  ${prefs.showInMenuBar ? 'Yes' : 'No'}`);
          console.log(`  Notifications:     ${prefs.notifications?.onThemeChange ? 'On' : 'Off'}`);
          console.log(`  Schedule Enabled:  ${prefs.schedule?.enabled ? 'Yes' : 'No'}`);
          if (prefs.hookScript) {
            console.log(`  Hook Script:       ${prefs.hookScript}`);
          }
          console.log();
        }
      } catch (err) {
        error('Failed to get preferences', err instanceof Error ? err.message : undefined);
        process.exit(EXIT_CODES.ERROR);
      }
    });

  // config set <key> <value>
  config
    .command('set <key> <value>')
    .description('Set a preference value')
    .action(async (key, value) => {
      try {
        // Parse boolean values
        let parsedValue: unknown = value;
        if (value === 'true') parsedValue = true;
        else if (value === 'false') parsedValue = false;
        else if (!isNaN(Number(value))) parsedValue = Number(value);

        // Handle nested keys like "notifications.onThemeChange"
        const keys = key.split('.');
        const prefs = await getPreferences();

        // Type guard for nested objects
        function isRecord(value: unknown): value is Record<string, unknown> {
          return typeof value === 'object' && value !== null;
        }

        // Type-safe nested value setter
        function setNestedValue(
          obj: Record<string, unknown>,
          keyPath: string[],
          value: unknown
        ): void {
          let current = obj;
          for (let i = 0; i < keyPath.length - 1; i++) {
            const k = keyPath[i];
            if (k === undefined) continue;
            if (!isRecord(current[k])) {
              current[k] = {};
            }
            const next = current[k];
            if (isRecord(next)) {
              current = next;
            }
          }
          const finalKey = keyPath[keyPath.length - 1];
          if (finalKey !== undefined) {
            current[finalKey] = value;
          }
        }

        // Safely convert prefs to mutable record for updates
        const mutablePrefs: Record<string, unknown> = { ...prefs };
        setNestedValue(mutablePrefs, keys, parsedValue);

        // Copy updated values back to prefs object
        Object.assign(prefs, mutablePrefs);

        await updatePreferences(prefs);

        if (isJsonMode()) {
          output({ success: true, key, value: parsedValue });
        } else {
          success(`Set ${key} = ${parsedValue}`);
        }
      } catch (err) {
        error('Failed to set preference', err instanceof Error ? err.message : undefined);
        process.exit(EXIT_CODES.ERROR);
      }
    });

  // config get <key>
  config
    .command('get <key>')
    .description('Get a preference value')
    .action(async (key) => {
      try {
        const prefs = await getPreferences();

        // Handle nested keys
        const keys = key.split('.');
        let value: unknown = prefs;
        for (const k of keys) {
          if (value && typeof value === 'object' && k in value) {
            value = (value as Record<string, unknown>)[k];
          } else {
            value = undefined;
            break;
          }
        }

        if (isJsonMode()) {
          output({ key, value });
        } else {
          if (value === undefined) {
            console.log(chalk.gray(`${key}: (not set)`));
          } else {
            console.log(`${key}: ${JSON.stringify(value)}`);
          }
        }
      } catch (err) {
        error('Failed to get preference', err instanceof Error ? err.message : undefined);
        process.exit(EXIT_CODES.ERROR);
      }
    });

  return config;
}
