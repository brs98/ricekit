import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use IPC
contextBridge.exposeInMainWorld('electronAPI', {
  // Theme operations
  listThemes: () => ipcRenderer.invoke('theme:list'),
  getTheme: (name: string) => ipcRenderer.invoke('theme:get', name),
  applyTheme: (name: string) => ipcRenderer.invoke('theme:apply', name),
  createTheme: (data: any) => ipcRenderer.invoke('theme:create', data),
  updateTheme: (name: string, data: any) => ipcRenderer.invoke('theme:update', name, data),
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

  // Application operations
  detectApps: () => ipcRenderer.invoke('apps:detect'),
  setupApp: (appName: string) => ipcRenderer.invoke('apps:setup', appName),
  refreshApp: (appName: string) => ipcRenderer.invoke('apps:refresh', appName),

  // Preferences operations
  getPreferences: () => ipcRenderer.invoke('preferences:get'),
  setPreferences: (prefs: any) => ipcRenderer.invoke('preferences:set', prefs),
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
  saveUIState: (uiState: any) => ipcRenderer.invoke('uistate:save', uiState),
  getUIState: () => ipcRenderer.invoke('uistate:get'),

  // Quick switcher operations
  closeQuickSwitcher: () => ipcRenderer.invoke('quickswitcher:close'),
  onQuickSwitcherOpened: (callback: () => void) => {
    ipcRenderer.on('quick-switcher-opened', () => callback());
  },

  // Utility operations
  openExternal: (url: string) => ipcRenderer.invoke('system:openExternal', url),
  openHelp: () => ipcRenderer.invoke('system:openHelp'),

  // Logging operations
  getLogDirectory: () => ipcRenderer.invoke('logging:getDirectory'),
  getLogFile: () => ipcRenderer.invoke('logging:getLogFile'),
  clearLogs: () => ipcRenderer.invoke('logging:clearLogs'),
  setDebugLogging: (enabled: boolean) => ipcRenderer.invoke('logging:setDebugEnabled', enabled),
  isDebugLoggingEnabled: () => ipcRenderer.invoke('logging:isDebugEnabled'),

  // Update operations
  checkForUpdates: () => ipcRenderer.invoke('system:checkForUpdates'),
});
