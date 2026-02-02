/**
 * Centralized application configuration
 *
 * All app name references are centralized here to make renaming easy.
 * When renaming the app, update these values and package.json.
 */

/** App configuration shape for type validation */
interface AppConfigShape {
  name: string;
  cliName: string;
  dataDirName: string;
  appId: string;
  defaultTheme: string;
  logFileName: string;
  repoOwner: string;
  repoName: string;
}

export const APP_CONFIG = {
  /** Display name shown in UI, menus, and notifications */
  name: 'Ricekit',

  /** CLI command name (lowercase, no spaces) */
  cliName: 'ricekit',

  /** Directory name in ~/Library/Application Support/ */
  dataDirName: 'Ricekit',

  /** macOS bundle identifier */
  appId: 'com.ricekit.app',

  /** Default theme applied on fresh install */
  defaultTheme: 'tokyo-night',

  /** Log file name (without extension) */
  logFileName: 'ricekit',

  /** GitHub repository for updates */
  repoOwner: 'your-org',
  repoName: 'ricekit',
} as const satisfies AppConfigShape;

/** Exit codes for CLI */
export const EXIT_CODES = {
  SUCCESS: 0,
  ERROR: 1,
  INVALID_ARGS: 2,
} as const satisfies Record<string, number>;

/** CLI output formats */
export type OutputFormat = 'human' | 'json';
