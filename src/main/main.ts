import { app, BrowserWindow, nativeTheme, Tray, Menu, nativeImage, globalShortcut, protocol, net, screen } from 'electron';
import path from 'path';
import fs from 'fs';
import { initializeApp, initializeAppAfterThemes, getPreferencesPath, getStatePath } from './directories';
import { installBundledThemes } from './themeInstaller';
import { installBundledPresets } from './presetInstaller';
import { setupIpcHandlers, handleAppearanceChange, startScheduler, stopScheduler } from './ipcHandlers';
import { logger } from './logger';

let mainWindow: BrowserWindow | null = null;
let quickSwitcherWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

/**
 * Create or update the menu bar tray icon and menu
 */
function createTray() {
  // Create a monochrome template icon for the macOS menu bar
  // For macOS, we create a 22x22 icon (template size for menu bar)
  const createTrayIcon = (): Electron.NativeImage => {
    // Create a simple color swatches icon (theming concept)
    // macOS menu bar icons should be black on transparent, system will handle light/dark mode
    // Three circles representing color swatches - simple and clear at 22x22
    const svg = `
      <svg width="22" height="22" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22">
        <circle cx="5.5" cy="11" r="3.5" fill="black" stroke="black" stroke-width="1"/>
        <circle cx="11" cy="11" r="3.5" fill="black" stroke="black" stroke-width="1"/>
        <circle cx="16.5" cy="11" r="3.5" fill="black" stroke="black" stroke-width="1"/>
      </svg>
    `;
    const image = nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`);
    // Mark as template so macOS handles light/dark mode automatically
    image.setTemplateImage(true);
    return image;
  };

  if (!tray) {
    // Create tray icon
    const icon = createTrayIcon();
    tray = new Tray(icon);
    tray.setToolTip('Flowstate - Theme Switcher');
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
    const menuItems: Electron.MenuItemConstructorOptions[] = [];

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
              await (handleApplyTheme as (event: unknown, name: string) => Promise<void>)(null, themeName);
              updateTrayMenu(); // Refresh menu
            } catch (err) {
              logger.error('Failed to apply theme from tray:', err);
            }
          },
        });
      });

      menuItems.push({ type: 'separator' });
    }

    // Main menu items
    menuItems.push(
      {
        label: 'Open Flowstate',
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
        label: 'Quit Flowstate',
        role: 'quit',
      }
    );

    const contextMenu = Menu.buildFromTemplate(menuItems);
    tray.setContextMenu(contextMenu);
  } catch (err) {
    logger.error('Error updating tray menu:', err);
  }
}

/**
 * Export function to update tray from other modules
 */
export function refreshTrayMenu() {
  updateTrayMenu();
}

/**
 * Update the main window title to show current theme name
 */
export function updateWindowTitle(themeName: string) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setTitle(`Flowstate - ${themeName}`);
    logger.info(`Window title updated to: Flowstate - ${themeName}`);
  }
}

/**
 * Notify the renderer (main window) that the theme has changed
 * This triggers the app's self-theming to update its UI colors
 */
export function notifyRendererThemeChanged(themeName: string) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('theme:changed', themeName);
    logger.info(`Notified renderer of theme change: ${themeName}`);
  }
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
    logger.info('Quick switcher shortcut triggered:', shortcut);
    toggleQuickSwitcher();
  });

  if (!ret) {
    logger.error('Failed to register new shortcut:', shortcut);
  } else {
    logger.info('Quick switcher shortcut updated to:', shortcut);
  }

  // Verify shortcut is registered
  logger.info('Shortcut registered:', globalShortcut.isRegistered(accelerator));
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

  // Set initial window title based on current theme
  try {
    const statePath = getStatePath();
    const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    const currentTheme = state.currentTheme || 'tokyo-night';
    logger.info(`Setting window title to: Flowstate - ${currentTheme}`);
    mainWindow.setTitle(`Flowstate - ${currentTheme}`);
    logger.info(`Window title set successfully`);
  } catch (err) {
    logger.error('Error setting initial window title:', err);
    mainWindow.setTitle('Flowstate');
  }

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

  // Set window title again after page finishes loading
  mainWindow.webContents.once('did-finish-load', () => {
    try {
      const statePath = getStatePath();
      const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      const currentTheme = state.currentTheme || 'tokyo-night';
      mainWindow?.setTitle(`Flowstate - ${currentTheme}`);
      logger.info(`Window title set after load: Flowstate - ${currentTheme}`);
    } catch (err) {
      logger.error('Error setting window title after load:', err);
      mainWindow?.setTitle('Flowstate');
    }
  });

  // Handle window close button - hide instead of close on macOS
  mainWindow.on('close', (event) => {
    // On macOS, hide the window instead of closing it (unless actually quitting)
    // This allows the app to stay in the menu bar when closing the window
    if (process.platform === 'darwin' && !isQuitting) {
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
      // Focus the webContents so keyboard input works immediately
      quickSwitcherWindow.webContents.focus();
      quickSwitcherWindow.webContents.send('quick-switcher-opened');
    }
  });

  // Handle Escape key at the Electron level (before it reaches the renderer)
  quickSwitcherWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'Escape' && input.type === 'keyDown') {
      event.preventDefault();
      logger.info('Escape pressed - hiding quick switcher');
      if (quickSwitcherWindow) {
        quickSwitcherWindow.hide();
      }
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

// Request single instance lock to prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Another instance is already running, quit this one
  logger.info('Another instance is already running. Quitting this instance.');
  app.quit();
} else {
  // This is the first instance, register second-instance handler
  app.on('second-instance', (_event, _commandLine, _workingDirectory) => {
    // Someone tried to run a second instance, focus our window instead
    logger.info('Second instance detected. Focusing existing window.');
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
      mainWindow.focus();
    } else {
      // Window doesn't exist, create it
      createWindow();
    }
  });

  // This method will be called when Electron has finished initialization
  app.whenReady().then(async () => {
    // Register custom protocol handler for loading local files
    // This is required because file:// URLs are blocked in renderer with contextIsolation
    protocol.handle('local-file', (request) => {
      // Convert local-file:// URL to file path
      // Example: local-file:///Users/foo/image.jpg -> /Users/foo/image.jpg
      const filePath = decodeURIComponent(request.url.replace('local-file://', ''));
      return net.fetch(`file://${filePath}`);
    });
    logger.info('Registered local-file protocol handler');

    // Initialize application directories and files
    logger.info('=== Flowstate Starting ===');
    logger.info('=== Flowstate Starting ===');

    // Load preferences to check if debug logging is enabled
    try {
      const prefsPath = getPreferencesPath();
      const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf-8'));
      if (prefs.debugLogging === true) {
        logger.setDebugEnabled(true);
        logger.debug('Debug logging enabled from preferences');
      }
    } catch (err) {
      logger.warn('Could not load debug logging preference', err);
    }

    initializeApp();
    logger.info('App directories initialized');

    await installBundledThemes();
    logger.info('Bundled themes installed');

    await installBundledPresets();
    logger.info('Bundled presets installed');

    // Initialize theme symlink after themes are installed
    initializeAppAfterThemes();

  // Setup IPC handlers
  setupIpcHandlers();

  // Setup system appearance change listener
  nativeTheme.on('updated', () => {
    logger.info('Native theme updated event fired');
    handleAppearanceChange();
  });

  // Log current appearance on startup
  logger.info(`Current system appearance: ${nativeTheme.shouldUseDarkColors ? 'dark' : 'light'}`);

  // Create menu bar tray icon only if enabled in preferences
  try {
    const prefsPath = getPreferencesPath();
    const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf-8'));
    if (prefs.showInMenuBar !== false) {
      // Default to true if not set
      createTray();
      logger.info('Menu bar tray icon created');
    } else {
      logger.info('Menu bar tray icon disabled by preference');
    }
  } catch (err) {
    logger.error('Error reading preferences for tray:', err);
    // Default to creating tray if preferences can't be read
    createTray();
  }

  // Create main window
  createWindow();

  // Start unified scheduler (checks and applies themes/wallpapers based on time schedules)
  startScheduler();

  // Register global keyboard shortcut for quick switcher from preferences
  try {
    const prefsPath = getPreferencesPath();
    const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf-8'));
    const shortcut = prefs.keyboardShortcuts?.quickSwitcher || 'Cmd+Shift+T';
    const accelerator = shortcut.replace(/Cmd/g, 'CommandOrControl');

    const ret = globalShortcut.register(accelerator, () => {
      logger.info('Quick switcher shortcut triggered');
      toggleQuickSwitcher();
    });

    if (!ret) {
      logger.error('Global shortcut registration failed');
    } else {
      logger.info('Quick switcher shortcut registered:', shortcut);
    }

    // Verify shortcut is registered
    logger.info('Shortcut registered:', globalShortcut.isRegistered(accelerator));
  } catch (err) {
    logger.error('Failed to register keyboard shortcut:', err);
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

  // Set quitting flag before quit starts - this allows windows to close properly
  app.on('before-quit', () => {
    isQuitting = true;
  });

  // Unregister shortcuts and cleanup when app is about to quit
  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    stopScheduler();
  });
}
