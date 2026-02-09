/**
 * StrictOmit - A stricter version of Omit that only allows keys that exist on T
 * Use this instead of Omit when you want TypeScript to catch typos in key names
 */
export type StrictOmit<T, K extends keyof T> = Omit<T, K>;

/**
 * Type-safe Object.keys that preserves key types.
 * Use when you control the object and know it won't have extra keys at runtime.
 */
export function typedKeys<T extends object>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}

/**
 * Type-safe Object.entries that preserves key and value types.
 * Use when you control the object and know it won't have extra keys at runtime.
 */
export function typedEntries<T extends object>(obj: T): [keyof T, T[keyof T]][] {
  return Object.entries(obj) as [keyof T, T[keyof T]][];
}

// Theme metadata structure
export interface ThemeColors {
  background: string;
  foreground: string;
  cursor: string;
  selection: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
  accent: string;
  border: string;
}

// Lock state for derived colors in simplified theme editor
// true = locked (manual override), false/undefined = auto-calculated
export type DerivedColorKey =
  | 'brightBlack'
  | 'brightRed'
  | 'brightGreen'
  | 'brightYellow'
  | 'brightBlue'
  | 'brightMagenta'
  | 'brightCyan'
  | 'brightWhite'
  | 'cursor'
  | 'selection'
  | 'border'
  | 'accent';

export type ColorLockState = {
  [key in DerivedColorKey]?: boolean;
};

export interface ThemeMetadata {
  name: string;
  author?: string;
  description?: string;
  version?: string;
  colors: ThemeColors;
  colorLocks?: ColorLockState; // Optional: tracks which derived colors are manually overridden
  variants?: {
    light?: string;
    dark?: string;
  };
  preview?: string;
}

export interface Theme {
  name: string;
  path: string;
  metadata: ThemeMetadata;
  isCustom: boolean;
  isLight: boolean;
}

// Application detection
export interface AppInfo {
  name: string;
  displayName: string;
  category: 'terminal' | 'editor' | 'system' | 'tiling';
  isInstalled: boolean;
  isConfigured: boolean;
  hasRicekitIntegration: boolean;
  configPath?: string;
}

// Setup preview for transparent app configuration
export interface SetupPreview {
  action: 'create' | 'modify' | 'already_setup';
  configPath: string;
  fileExists: boolean;
  hasExistingIntegration: boolean;
  /** For 'create' action - full template content */
  newContent?: string;
  /** For 'modify' action - snippet to add */
  snippet?: string;
  instructions?: string;
  /** Current file content (truncated for large files) */
  currentContent?: string;
  message: string;
}

// Plugin system types
export type PluginMode = 'preset' | 'custom';
export type InstalledBy = 'ricekit' | 'user' | 'unknown';

export interface PluginConfig {
  mode: PluginMode;
  preset?: string;
  installedBy: InstalledBy;
  configBackupPath?: string;
  lastUpdated?: number;
}

export interface PresetInfo {
  name: string;
  displayName: string;
  description: string;
  features: string[];
  previewImage?: string;
}

export interface PluginStatus {
  isInstalled: boolean;
  binaryPath?: string;
  version?: string;
  hasExistingConfig: boolean;
  configPath: string;
}

// Font status for Nerd Font detection
export interface FontStatus {
  hasNerdFont: boolean;
  installedFont: string | null;
  recommendedFont: string;
  supportedFonts: readonly string[];
}

// Schedule entry for unified theme/wallpaper scheduling
// Uses discriminated union to ensure type-correct property requirements
interface BaseScheduleEntry {
  timeStart: string;           // Time in HH:MM format (24-hour)
  timeEnd: string;             // Time in HH:MM format (24-hour)
  name?: string;               // Optional display name for the schedule
}

interface ThemeScheduleEntry extends BaseScheduleEntry {
  type: 'theme';
  themeName: string;           // Required when type === 'theme'
}

interface WallpaperScheduleEntry extends BaseScheduleEntry {
  type: 'wallpaper';
  wallpaperPath: string;       // Required when type === 'wallpaper'
}

export type ScheduleEntry = ThemeScheduleEntry | WallpaperScheduleEntry;

// Preferences structure
export interface Preferences {
  enabledApps: string[];
  favorites: string[];
  recentThemes: string[];
  keyboardShortcuts: {
    quickSwitcher: string;
    cycleWallpaper: string;
  };
  startAtLogin: boolean;
  showInMenuBar: boolean;
  showNotifications: boolean; // Legacy field for backward compatibility
  notifications: {
    onThemeChange: boolean;
    onScheduledSwitch: boolean;
  };
  hookScript?: string; // Optional path to user-defined hook script
  onboardingCompleted: boolean; // Whether user has completed the onboarding wizard
  debugLogging?: boolean; // Enable verbose debug logging
  dynamicWallpaper?: {
    enabled: boolean; // Enable automatic wallpaper switching based on system appearance
  };
  schedule?: {
    enabled: boolean; // Enable time-based scheduling
    schedules: ScheduleEntry[];
  };
  pluginConfigs?: Record<string, PluginConfig>;
}

// State structure
export interface State {
  currentTheme: string;
  currentWallpaper?: string;
  lastSwitched: number;
}

// Sort mode options for theme listing
export type SortMode = 'default' | 'name-asc' | 'name-desc' | 'recent';

// Filter mode options for theme listing
export type FilterMode = 'all' | 'light' | 'dark' | 'favorites';

// UI State for saving/restoring app state
export interface UIState {
  activeView?: string;
  searchQuery?: string;
  filterMode?: FilterMode;
  sortMode?: SortMode;
  editorTheme?: {
    name: string;
    metadata: ThemeMetadata;
  };
  scrollPosition?: number;
}

// Window API types
export interface ElectronAPI {
  listThemes: () => Promise<Theme[]>;
  getTheme: (name: string) => Promise<Theme>;
  applyTheme: (name: string) => Promise<void>;
  createTheme: (data: ThemeMetadata, sourceImageDataUrl?: string, isLight?: boolean) => Promise<void>;
  updateTheme: (name: string, data: ThemeMetadata) => Promise<void>;
  deleteTheme: (name: string) => Promise<void>;
  duplicateTheme: (name: string) => Promise<void>;
  exportTheme: (name: string, path?: string) => Promise<string>;
  importTheme: (path: string) => Promise<void>;
  importThemeFromUrl: (url: string) => Promise<void>;
  listWallpapers: (themeName: string) => Promise<string[]>;
  listWallpapersWithThumbnails: (themeName: string) => Promise<Array<{ original: string; thumbnail: string }>>;
  applyWallpaper: (path: string, displayIndex?: number) => Promise<void>;
  getDisplays: () => Promise<Array<{ id: string; index: number; name: string; resolution: string; isMain: boolean }>>;
  clearThumbnailCache: () => Promise<void>;
  getThumbnailCacheStats: () => Promise<{ count: number; sizeBytes: number; sizeMB: number }>;
  detectApps: () => Promise<AppInfo[]>;
  setupApp: (appName: string) => Promise<void>;
  previewSetupApp: (appName: string) => Promise<SetupPreview>;
  refreshApp: (appName: string) => Promise<void>;
  getPreferences: () => Promise<Preferences>;
  setPreferences: (prefs: Preferences) => Promise<void>;
  backupPreferences: () => Promise<string | null>;
  restorePreferences: () => Promise<boolean>;
  getSystemAppearance: () => Promise<'light' | 'dark'>;
  getSunriseSunset: () => Promise<{ sunrise: string; sunset: string; location: string } | null>;
  onAppearanceChange: (callback: (appearance: string) => void) => void;
  getState: () => Promise<State>;
  saveUIState: (uiState: UIState) => Promise<void>;
  getUIState: () => Promise<UIState | null>;
  closeQuickSwitcher: () => Promise<void>;
  onQuickSwitcherOpened: (callback: () => void) => void;
  onThemeChanged: (callback: (themeName: string) => void) => void;
  openExternal: (url: string) => Promise<void>;
  openPath: (path: string) => Promise<void>;
  openHelp: () => Promise<void>;
  addWallpapers: (themeName: string) => Promise<{ added: string[]; errors: string[] }>;
  removeWallpaper: (wallpaperPath: string) => Promise<void>;
  getLogDirectory: () => Promise<string>;
  getLogFile: () => Promise<string>;
  clearLogs: () => Promise<void>;
  setDebugLogging: (enabled: boolean) => Promise<void>;
  isDebugLoggingEnabled: () => Promise<boolean>;
  checkForUpdates: () => Promise<{
    currentVersion: string;
    latestVersion: string;
    hasUpdate: boolean;
    updateUrl?: string;
    error?: string;
  }>;

  // Plugin operations
  getPluginStatus: (appName: string) => Promise<PluginStatus>;
  installPlugin: (appName: string) => Promise<void>;
  listPresets: (appName: string) => Promise<PresetInfo[]>;
  setPreset: (appName: string, presetName: string) => Promise<void>;
  getPluginConfig: (appName: string) => Promise<PluginConfig | null>;
  resetPluginToCustom: (appName: string) => Promise<void>;
  hasPluginBackup: (appName: string) => Promise<boolean>;
  restorePluginBackup: (appName: string) => Promise<{ success: boolean; error?: string }>;

  // Font operations
  getFontStatus: () => Promise<FontStatus>;
  installNerdFont: (fontName?: string) => Promise<{ success: boolean; error?: string; installedFont?: string }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
