import { contextBridge, ipcRenderer } from 'electron';
import type { ThemeMetadata, Preferences, UIState } from '../shared/types';

// Expose protected methods that allow the renderer process to use IPC
contextBridge.exposeInMainWorld('electronAPI', {
  // Theme operations
  listThemes: () => ipcRenderer.invoke('theme:list'),
  getTheme: (name: string) => ipcRenderer.invoke('theme:get', name),
  applyTheme: (name: string) => ipcRenderer.invoke('theme:apply', name),
  createTheme: (data: ThemeMetadata, sourceImageDataUrl?: string, isLight?: boolean) =>
    ipcRenderer.invoke('theme:create', data, sourceImageDataUrl, isLight),
  updateTheme: (name: string, data: ThemeMetadata) => ipcRenderer.invoke('theme:update', name, data),
  deleteTheme: (name: string) => ipcRenderer.invoke('theme:delete', name),
  duplicateTheme: (name: string) => ipcRenderer.invoke('theme:duplicate', name),
  exportTheme: (name: string, path?: string) => ipcRenderer.invoke('theme:export', name, path),
  importTheme: (path: string) => ipcRenderer.invoke('theme:import', path),
  importThemeFromUrl: (url: string) => ipcRenderer.invoke('theme:importFromUrl', url),

  // Wallpaper operations
  listWallpapers: (themeName: string) => ipcRenderer.invoke('wallpaper:list', themeName),
  listWallpapersWithThumbnails: (themeName: string) => ipcRenderer.invoke('wallpaper:listWithThumbnails', themeName),
  applyWallpaper: (path: string, displayIndex?: number) => ipcRenderer.invoke('wallpaper:apply', path, displayIndex),
  getDisplays: () => ipcRenderer.invoke('wallpaper:getDisplays'),
  clearThumbnailCache: () => ipcRenderer.invoke('wallpaper:clearThumbnailCache'),
  getThumbnailCacheStats: () => ipcRenderer.invoke('wallpaper:getThumbnailCacheStats'),
  addWallpapers: (themeName: string) => ipcRenderer.invoke('wallpaper:add', themeName),
  removeWallpaper: (wallpaperPath: string) => ipcRenderer.invoke('wallpaper:remove', wallpaperPath),

  // Application operations
  detectApps: () => ipcRenderer.invoke('apps:detect'),
  setupApp: (appName: string) => ipcRenderer.invoke('apps:setup', appName),
  refreshApp: (appName: string) => ipcRenderer.invoke('apps:refresh', appName),

  // Preferences operations
  getPreferences: () => ipcRenderer.invoke('preferences:get'),
  setPreferences: (prefs: Preferences) => ipcRenderer.invoke('preferences:set', prefs),
  backupPreferences: () => ipcRenderer.invoke('preferences:backup'),
  restorePreferences: () => ipcRenderer.invoke('preferences:restore'),

  // System operations
  getSystemAppearance: () => ipcRenderer.invoke('system:appearance'),
  getSunriseSunset: () => ipcRenderer.invoke('system:getSunriseSunset'),
  onAppearanceChange: (callback: (appearance: string) => void) => {
    ipcRenderer.on('system:appearance-changed', (_event, appearance) => callback(appearance));
  },

  // State operations
  getState: () => ipcRenderer.invoke('state:get'),
  saveUIState: (uiState: UIState) => ipcRenderer.invoke('uistate:save', uiState),
  getUIState: () => ipcRenderer.invoke('uistate:get'),

  // Quick switcher operations
  closeQuickSwitcher: () => ipcRenderer.invoke('quickswitcher:close'),
  onQuickSwitcherOpened: (callback: () => void) => {
    ipcRenderer.on('quick-switcher-opened', () => callback());
  },

  // Theme change notification (from scheduler, quick switcher, etc.)
  onThemeChanged: (callback: (themeName: string) => void) => {
    ipcRenderer.on('theme:changed', (_event, themeName) => callback(themeName));
  },

  // Utility operations
  openExternal: (url: string) => ipcRenderer.invoke('system:openExternal', url),
  openPath: (filePath: string) => ipcRenderer.invoke('system:openPath', filePath),
  openHelp: () => ipcRenderer.invoke('system:openHelp'),

  // Logging operations
  getLogDirectory: () => ipcRenderer.invoke('logging:getDirectory'),
  getLogFile: () => ipcRenderer.invoke('logging:getLogFile'),
  clearLogs: () => ipcRenderer.invoke('logging:clearLogs'),
  setDebugLogging: (enabled: boolean) => ipcRenderer.invoke('logging:setDebugEnabled', enabled),
  isDebugLoggingEnabled: () => ipcRenderer.invoke('logging:isDebugEnabled'),

  // Update operations
  checkForUpdates: () => ipcRenderer.invoke('system:checkForUpdates'),

  // Plugin operations
  getPluginStatus: (appName: string) => ipcRenderer.invoke('plugins:getStatus', appName),
  installPlugin: (appName: string) => ipcRenderer.invoke('plugins:install', appName),
  listPresets: (appName: string) => ipcRenderer.invoke('plugins:listPresets', appName),
  setPreset: (appName: string, presetName: string) =>
    ipcRenderer.invoke('plugins:setPreset', appName, presetName),
  getPluginConfig: (appName: string) => ipcRenderer.invoke('plugins:getConfig', appName),
  resetPluginToCustom: (appName: string) => ipcRenderer.invoke('plugins:resetToCustom', appName),
  hasPluginBackup: (appName: string) => ipcRenderer.invoke('plugins:hasBackup', appName),
  restorePluginBackup: (appName: string) => ipcRenderer.invoke('plugins:restoreBackup', appName),

  // Font operations
  getFontStatus: () => ipcRenderer.invoke('plugins:getFontStatus'),
  installNerdFont: (fontName?: string) => ipcRenderer.invoke('plugins:installNerdFont', fontName),
});
