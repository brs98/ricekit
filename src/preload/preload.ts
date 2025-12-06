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
  exportTheme: (name: string, path: string) => ipcRenderer.invoke('theme:export', name, path),
  importTheme: (path: string) => ipcRenderer.invoke('theme:import', path),

  // Wallpaper operations
  listWallpapers: (themeName: string) => ipcRenderer.invoke('wallpaper:list', themeName),
  applyWallpaper: (path: string) => ipcRenderer.invoke('wallpaper:apply', path),

  // Application operations
  detectApps: () => ipcRenderer.invoke('apps:detect'),
  setupApp: (appName: string, mode: string) => ipcRenderer.invoke('apps:setup', appName, mode),
  refreshApp: (appName: string) => ipcRenderer.invoke('apps:refresh', appName),

  // Preferences operations
  getPreferences: () => ipcRenderer.invoke('preferences:get'),
  setPreferences: (prefs: any) => ipcRenderer.invoke('preferences:set', prefs),

  // System operations
  getSystemAppearance: () => ipcRenderer.invoke('system:appearance'),
  onAppearanceChange: (callback: (appearance: string) => void) => {
    ipcRenderer.on('system:appearance-changed', (_event, appearance) => callback(appearance));
  },

  // State operations
  getState: () => ipcRenderer.invoke('state:get'),
});
