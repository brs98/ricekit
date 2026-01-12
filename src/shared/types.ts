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
  author: string;
  description: string;
  version: string;
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
  category: 'terminal' | 'editor' | 'cli' | 'launcher' | 'system' | 'communication' | 'tiling';
  isInstalled: boolean;
  isConfigured: boolean;
  configPath?: string;
}

// Plugin system types
export type PluginMode = 'preset' | 'custom';
export type InstalledBy = 'mactheme' | 'user' | 'unknown';

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
export interface ScheduleEntry {
  timeStart: string;           // Time in HH:MM format (24-hour)
  timeEnd: string;             // Time in HH:MM format (24-hour)
  name?: string;               // Optional display name for the schedule
  type: 'theme' | 'wallpaper'; // What to apply
  themeName?: string;          // Theme name (when type === 'theme')
  wallpaperPath?: string;      // Full path to wallpaper (when type === 'wallpaper')
}

// Preferences structure
export interface Preferences {
  enabledApps: string[];
  favorites: string[];
  recentThemes: string[];
  keyboardShortcuts: {
    quickSwitcher: string;
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
  pluginConfigs?: {
    [appName: string]: PluginConfig;
  };
}

// State structure
export interface State {
  currentTheme: string;
  currentWallpaper?: string;
  lastSwitched: number;
}

// Window API types
export interface ElectronAPI {
  listThemes: () => Promise<Theme[]>;
  getTheme: (name: string) => Promise<Theme>;
  applyTheme: (name: string) => Promise<void>;
  createTheme: (data: ThemeMetadata) => Promise<void>;
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
  refreshApp: (appName: string) => Promise<void>;
  getPreferences: () => Promise<Preferences>;
  setPreferences: (prefs: Preferences) => Promise<void>;
  backupPreferences: () => Promise<string | null>;
  restorePreferences: () => Promise<boolean>;
  getSystemAppearance: () => Promise<'light' | 'dark'>;
  getSunriseSunset: () => Promise<{ sunrise: string; sunset: string; location: string } | null>;
  onAppearanceChange: (callback: (appearance: string) => void) => void;
  getState: () => Promise<State>;
  saveUIState: (uiState: any) => Promise<void>;
  getUIState: () => Promise<any | null>;
  closeQuickSwitcher: () => Promise<void>;
  onQuickSwitcherOpened: (callback: () => void) => void;
  onThemeChanged: (callback: (themeName: string) => void) => void;
  openExternal: (url: string) => Promise<void>;
  openHelp: () => Promise<void>;
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
