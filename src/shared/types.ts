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

export interface ThemeMetadata {
  name: string;
  author: string;
  description: string;
  version: string;
  colors: ThemeColors;
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
  category: 'terminal' | 'editor' | 'cli' | 'launcher' | 'system';
  isInstalled: boolean;
  isConfigured: boolean;
  configPath?: string;
}

// Preferences structure
export interface Preferences {
  defaultLightTheme: string;
  defaultDarkTheme: string;
  enabledApps: string[];
  favorites: string[];
  recentThemes: string[];
  keyboardShortcuts: {
    quickSwitcher: string;
  };
  autoSwitch: {
    enabled: boolean;
    mode: 'system' | 'schedule' | 'sunset';
  };
  schedule?: {
    light: string;
    dark: string;
  };
  startAtLogin: boolean;
  showInMenuBar: boolean;
  showNotifications: boolean;
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
  exportTheme: (name: string, path: string) => Promise<void>;
  importTheme: (path: string) => Promise<void>;
  listWallpapers: (themeName: string) => Promise<string[]>;
  applyWallpaper: (path: string) => Promise<void>;
  detectApps: () => Promise<AppInfo[]>;
  setupApp: (appName: string, mode: string) => Promise<void>;
  refreshApp: (appName: string) => Promise<void>;
  getPreferences: () => Promise<Preferences>;
  setPreferences: (prefs: Preferences) => Promise<void>;
  getSystemAppearance: () => Promise<'light' | 'dark'>;
  onAppearanceChange: (callback: (appearance: string) => void) => void;
  getState: () => Promise<State>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
