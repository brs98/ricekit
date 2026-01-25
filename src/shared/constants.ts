/**
 * Centralized application configuration
 *
 * All app name references are centralized here to make renaming easy.
 * When renaming the app, update these values and package.json.
 */

export const APP_CONFIG = {
  /** Display name shown in UI, menus, and notifications */
  name: 'MacTheme',

  /** CLI command name (lowercase, no spaces) */
  cliName: 'mactheme',

  /** Directory name in ~/Library/Application Support/ */
  dataDirName: 'MacTheme',

  /** macOS bundle identifier */
  appId: 'com.mactheme.app',

  /** Default theme applied on fresh install */
  defaultTheme: 'tokyo-night',

  /** Log file name (without extension) */
  logFileName: 'mactheme',

  /** GitHub repository for updates */
  repoOwner: 'your-org',
  repoName: 'mactheme',
} as const;

/** Exit codes for CLI */
export const EXIT_CODES = {
  SUCCESS: 0,
  ERROR: 1,
  INVALID_ARGS: 2,
} as const;

/** CLI output formats */
export type OutputFormat = 'human' | 'json';
