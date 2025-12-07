import { app, BrowserWindow, ipcMain, nativeTheme, Tray, Menu, nativeImage, globalShortcut } from 'electron';
import path from 'path';
import fs from 'fs';
import { initializeApp, getPreferencesPath, getStatePath } from './directories';
import { installBundledThemes } from './themeInstaller';
import { setupIpcHandlers, handleAppearanceChange, checkScheduleAndApplyTheme } from './ipcHandlers';

let mainWindow: BrowserWindow | null = null;
let quickSwitcherWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

/**
 * Create or update the menu bar tray icon and menu
 */
function createTray() {
  // Create a simple colored icon for the tray
  // For macOS, we create a 22x22 icon (template size for menu bar)
  const createTrayIcon = (color: string = '#007AFF'): Electron.NativeImage => {
    // Create a simple SVG icon
    const svg = `
      <svg width="22" height="22" xmlns="http://www.w3.org/2000/svg">
        <circle cx="11" cy="11" r="8" fill="${color}" opacity="0.8"/>
        <circle cx="11" cy="11" r="6" fill="none" stroke="${color}" stroke-width="2"/>
      </svg>
    `;
    return nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`);
  };

  if (!tray) {
    // Create tray icon
    const icon = createTrayIcon();
    tray = new Tray(icon);
    tray.setToolTip('MacTheme - Theme Switcher');
  }

  updateTrayMenu();
}

/**
 * Update the tray menu with recent themes
 */
function updateTrayMenu() {
  if (!tray) return;

  try {
    // Read preferences to get recent themes
    const prefsPath = getPreferencesPath();
    const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf-8'));
    const recentThemes = prefs.recentThemes || [];

    // Read current state
    const statePath = getStatePath();
    const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    const currentTheme = state.currentTheme || '';

    // Build menu items
    const menuItems: any[] = [];

    // Recent themes section (limit to 5)
    if (recentThemes.length > 0) {
      menuItems.push({
        label: 'Recent Themes',
        enabled: false,
      });

      recentThemes.slice(0, 5).forEach((themeName: string) => {
        menuItems.push({
          label: themeName,
          type: 'checkbox',
          checked: themeName === currentTheme,
          click: async () => {
            // Apply theme via IPC
            const { handleApplyTheme } = await import('./ipcHandlers');
            try {
              await (handleApplyTheme as any)(null, themeName);
              updateTrayMenu(); // Refresh menu
            } catch (err) {
              console.error('Failed to apply theme from tray:', err);
            }
          },
        });
      });

      menuItems.push({ type: 'separator' });
    }

    // Main menu items
    menuItems.push(
      {
        label: 'Open MacTheme',
        click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.show();
            mainWindow.focus();
          } else {
            createWindow();
          }
        },
      },
      {
        label: 'Preferences',
        click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.show();
            mainWindow.focus();
            // Could send IPC to navigate to settings
            mainWindow.webContents.send('navigate-to', 'settings');
          } else {
            createWindow();
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Quit MacTheme',
        role: 'quit',
      }
    );

    const contextMenu = Menu.buildFromTemplate(menuItems);
    tray.setContextMenu(contextMenu);
  } catch (err) {
    console.error('Error updating tray menu:', err);
  }
}

/**
 * Export function to update tray from other modules
 */
export function refreshTrayMenu() {
  updateTrayMenu();
}

/**
 * Export function to show/hide tray based on preference
 */
export function updateTrayVisibility(show: boolean) {
  if (show && !tray) {
    // Create tray if it doesn't exist
    createTray();
  } else if (!show && tray) {
    // Destroy tray if it exists
    tray.destroy();
    tray = null;
  }
}

/**
 * Convert shortcut string to Electron accelerator format
 * Example: "Cmd+Shift+T" -> "CommandOrControl+Shift+T"
 */
function convertShortcutToAccelerator(shortcut: string): string {
  return shortcut.replace(/Cmd/g, 'CommandOrControl');
}

/**
 * Export function to update the quick switcher keyboard shortcut
 */
export function updateQuickSwitcherShortcut(shortcut: string) {
  // Unregister all shortcuts first
  globalShortcut.unregisterAll();

  // Convert the shortcut to Electron format
  const accelerator = convertShortcutToAccelerator(shortcut);

  // Register new shortcut
  const ret = globalShortcut.register(accelerator, () => {
    console.log('Quick switcher shortcut triggered:', shortcut);
    toggleQuickSwitcher();
  });

  if (!ret) {
    console.error('Failed to register new shortcut:', shortcut);
  } else {
    console.log('Quick switcher shortcut updated to:', shortcut);
  }

  // Verify shortcut is registered
  console.log('Shortcut registered:', globalShortcut.isRegistered(accelerator));
}

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

  // Handle window close button - hide instead of close on macOS
  mainWindow.on('close', (event) => {
    // On macOS, hide the window instead of closing it
    // This allows the app to stay in the menu bar
    if (process.platform === 'darwin') {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Create or show the quick switcher overlay window
 */
function createQuickSwitcher() {
  if (quickSwitcherWindow) {
    // If already exists, just show and focus it
    quickSwitcherWindow.show();
    quickSwitcherWindow.focus();
    quickSwitcherWindow.webContents.send('quick-switcher-opened');
    return;
  }

  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  // Create a centered, semi-transparent overlay window
  quickSwitcherWindow = new BrowserWindow({
    width: 600,
    height: 400,
    x: Math.floor((width - 600) / 2),
    y: Math.floor((height - 400) / 2),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.js'),
    },
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    quickSwitcherWindow.loadURL('http://localhost:5173/#/quick-switcher');
  } else {
    quickSwitcherWindow.loadFile(path.join(__dirname, '../renderer/index.html'), {
      hash: 'quick-switcher',
    });
  }

  quickSwitcherWindow.on('blur', () => {
    // Close quick switcher when it loses focus
    if (quickSwitcherWindow) {
      quickSwitcherWindow.hide();
    }
  });

  quickSwitcherWindow.on('closed', () => {
    quickSwitcherWindow = null;
  });

  // Send event to notify renderer that quick switcher opened
  quickSwitcherWindow.webContents.once('did-finish-load', () => {
    if (quickSwitcherWindow) {
      quickSwitcherWindow.webContents.send('quick-switcher-opened');
    }
  });
}

/**
 * Toggle quick switcher visibility
 */
function toggleQuickSwitcher() {
  if (quickSwitcherWindow && quickSwitcherWindow.isVisible()) {
    quickSwitcherWindow.hide();
  } else {
    createQuickSwitcher();
  }
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

  // Create menu bar tray icon only if enabled in preferences
  try {
    const prefsPath = getPreferencesPath();
    const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf-8'));
    if (prefs.showInMenuBar !== false) {
      // Default to true if not set
      createTray();
      console.log('Menu bar tray icon created');
    } else {
      console.log('Menu bar tray icon disabled by preference');
    }
  } catch (err) {
    console.error('Error reading preferences for tray:', err);
    // Default to creating tray if preferences can't be read
    createTray();
  }

  // Create main window
  createWindow();

  // Setup schedule-based auto-switching check (runs every minute)
  setInterval(() => {
    checkScheduleAndApplyTheme();
  }, 60 * 1000); // Check every 60 seconds

  // Also check immediately on startup
  checkScheduleAndApplyTheme();

  // Register global keyboard shortcut for quick switcher from preferences
  try {
    const prefsPath = getPreferencesPath();
    const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf-8'));
    const shortcut = prefs.keyboardShortcuts?.quickSwitcher || 'Cmd+Shift+T';
    const accelerator = shortcut.replace(/Cmd/g, 'CommandOrControl');

    const ret = globalShortcut.register(accelerator, () => {
      console.log('Quick switcher shortcut triggered');
      toggleQuickSwitcher();
    });

    if (!ret) {
      console.error('Global shortcut registration failed');
    } else {
      console.log('Quick switcher shortcut registered:', shortcut);
    }

    // Verify shortcut is registered
    console.log('Shortcut registered:', globalShortcut.isRegistered(accelerator));
  } catch (err) {
    console.error('Failed to register keyboard shortcut:', err);
  }

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

// Unregister shortcuts when app is about to quit
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
