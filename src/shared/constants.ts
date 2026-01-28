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
  name: 'Flowstate',

  /** CLI command name (lowercase, no spaces) */
  cliName: 'flowstate',

  /** Directory name in ~/Library/Application Support/ */
  dataDirName: 'Flowstate',

  /** macOS bundle identifier */
  appId: 'com.flowstate.app',

  /** Default theme applied on fresh install */
  defaultTheme: 'tokyo-night',

  /** Log file name (without extension) */
  logFileName: 'flowstate',

  /** GitHub repository for updates */
  repoOwner: 'your-org',
  repoName: 'flowstate',
} as const satisfies AppConfigShape;

/** Exit codes for CLI */
export const EXIT_CODES = {
  SUCCESS: 0,
  ERROR: 1,
  INVALID_ARGS: 2,
} as const satisfies Record<string, number>;

/** CLI output formats */
export type OutputFormat = 'human' | 'json';
