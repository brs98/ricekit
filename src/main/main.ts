import { app, BrowserWindow, ipcMain, nativeTheme } from 'electron';
import path from 'path';
import { initializeApp } from './directories';
import { installBundledThemes } from './themeInstaller';
import { setupIpcHandlers, handleAppearanceChange } from './ipcHandlers';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 20, y: 20 },
    vibrancy: 'sidebar',
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.js'),
    },
  });

  // In development, load from Vite dev server
  // We detect dev mode by checking if we're running from a dev location
  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from built files
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  // Initialize application directories and files
  console.log('=== MacTheme Starting ===');
  initializeApp();
  installBundledThemes();

  // Setup IPC handlers
  setupIpcHandlers();

  // Setup system appearance change listener
  nativeTheme.on('updated', () => {
    console.log('Native theme updated event fired');
    handleAppearanceChange();
  });

  // Log current appearance on startup
  console.log(`Current system appearance: ${nativeTheme.shouldUseDarkColors ? 'dark' : 'light'}`);

  // Create main window
  createWindow();

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked and no windows are open
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
