/**
 * Core abstraction interfaces
 *
 * These interfaces allow the same business logic to run in both
 * Electron (main process) and CLI contexts by abstracting
 * environment-specific concerns.
 */

/**
 * Provides paths to application directories and files.
 * Implementations differ between Electron (uses app.getPath) and CLI (uses os.homedir).
 */
export interface PathProvider {
  /** Base app data directory (e.g., ~/Library/Application Support/Ricekit) */
  getAppDataDir(): string;

  /** Directory containing bundled themes */
  getThemesDir(): string;

  /** Directory containing user-created custom themes */
  getCustomThemesDir(): string;

  /** Directory containing the current theme symlink */
  getCurrentDir(): string;

  /** Directory containing presets */
  getPresetsDir(): string;

  /** Directory containing current presets symlink */
  getCurrentPresetsDir(): string;

  /** Path to preferences.json */
  getPreferencesPath(): string;

  /** Path to state.json */
  getStatePath(): string;

  /** Path to ui-state.json (for crash recovery) */
  getUIStatePath(): string;

  /** Directory containing log files */
  getLogDir(): string;
}

/**
 * Logging service interface.
 * Implementations can log to console, file, or both.
 */
export interface LoggerService {
  /** Log debug-level message (only when debug mode enabled) */
  debug(message: string, data?: unknown): void;

  /** Log info-level message */
  info(message: string, data?: unknown): void;

  /** Log warning-level message */
  warn(message: string, data?: unknown): void;

  /** Log error-level message */
  error(message: string, error?: unknown): void;

  /** Enable or disable debug logging */
  setDebugEnabled(enabled: boolean): void;

  /** Check if debug logging is enabled */
  isDebugEnabled(): boolean;
}

/**
 * Notification service for user feedback.
 * Electron shows system notifications, CLI prints to console.
 */
export interface NotificationService {
  /** Show a notification to the user */
  show(title: string, body: string): void;

  /** Show a success notification */
  success(title: string, body: string): void;

  /** Show an error notification */
  error(title: string, body: string): void;
}

/**
 * Service container that holds all injectable services.
 * Pass this to core operations to make them environment-agnostic.
 */
export interface ServiceContainer {
  paths: PathProvider;
  logger: LoggerService;
  notifications: NotificationService;
}

/**
 * Result type for operations that can fail.
 * Provides type-safe error handling without exceptions.
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Create a success result
 */
export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

/**
 * Create a failure result
 */
export function err<E>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * CLI-specific output types for --json mode
 */
export interface CLIThemeListOutput {
  themes: Array<{
    name: string;
    isCustom: boolean;
    isLight: boolean;
    isCurrent: boolean;
    author?: string;
    description?: string;
  }>;
}

export interface CLIThemeApplyOutput {
  success: boolean;
  previousTheme: string;
  currentTheme: string;
  notifiedApps: string[];
  error?: string;
}

export interface CLIStatusOutput {
  currentTheme: string;
  currentWallpaper: string | null;
  installedApps: string[];
  configuredApps: string[];
  themesCount: number;
  customThemesCount: number;
  preferencesPath: string;
  dataDir: string;
}

export interface CLIWallpaperListOutput {
  wallpapers: Array<{
    path: string;
    filename: string;
  }>;
  themeName: string;
}

export interface CLIAppsListOutput {
  apps: Array<{
    name: string;
    displayName: string;
    category: string;
    isInstalled: boolean;
    isConfigured: boolean;
  }>;
}

export interface CLIPluginsListOutput {
  plugins: Array<{
    name: string;
    isInstalled: boolean;
    hasConfig: boolean;
    preset?: string;
  }>;
}

export interface CLIErrorOutput {
  success: false;
  error: string;
  code?: string;
}
