import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';

const testDir = path.join(os.tmpdir(), 'ricekit-app-test-' + Date.now());
const mockHomeDir = path.join(testDir, 'home');

// Mock electron modules
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name: string) => {
      if (name === 'appData') {
        return path.join(testDir, 'appdata');
      }
      return testDir;
    }),
  },
  ipcMain: {
    handle: vi.fn(),
  },
  Notification: {
    isSupported: vi.fn(() => false),
  },
  shell: {
    openPath: vi.fn(() => Promise.resolve('')),
  },
  clipboard: {
    writeText: vi.fn(),
  },
}));

// Mock os.homedir()
vi.mock('os', async () => {
  const actual = await vi.importActual('os');
  return {
    ...actual,
    homedir: vi.fn(() => mockHomeDir),
  };
});

// Mock the logger
vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock child_process
vi.mock('child_process', () => ({
  execSync: vi.fn(() => ''),
}));

// Mock asyncFs
vi.mock('../utils/asyncFs', () => ({
  existsSync: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  ensureDir: vi.fn(),
  copyFile: vi.fn(),
}));

// Mock preferencesHandlers
vi.mock('../handlers/preferencesHandlers', () => ({
  handleGetPreferences: vi.fn(() =>
    Promise.resolve({
      enabledApps: [],
      pluginConfigs: {},
      favorites: [],
      recentThemes: [],
      keyboardShortcuts: { quickSwitcher: 'Cmd+Shift+T' },
      startAtLogin: false,
      showInMenuBar: true,
      showNotifications: true,
      notifications: { onThemeChange: true, onScheduledSwitch: true },
      onboardingCompleted: false,
    })
  ),
  handleSetPreferences: vi.fn(() => Promise.resolve()),
}));

// Mock stateHandlers
vi.mock('../handlers/stateHandlers', () => ({
  handleGetState: vi.fn(() =>
    Promise.resolve({
      currentTheme: 'test-theme',
      isLoading: false,
    })
  ),
}));

// Mock the core setup module
vi.mock('../../core/apps/setup', () => ({
  setupApp: vi.fn(),
}));

// Mock the core apps module
vi.mock('../../core/apps', () => ({
  detectApps: vi.fn(() => Promise.resolve([])),
}));

// Import after mocks are set up
import {
  existsSync as mockExistsSync,
} from '../utils/asyncFs';
import { handleSetPreferences } from '../handlers/preferencesHandlers';
import { clipboard } from 'electron';
import {
  handleSetupApp,
} from '../handlers/appHandlers';
import { setupApp as coreSetupApp } from '../../core/apps/setup';

// Real home directory (captured before mocks)
const realHomeDir = os.homedir();

describe('appHandlers', () => {
  beforeEach(() => {
    // Create test directories
    fs.mkdirSync(path.join(testDir, 'appdata', 'Ricekit', 'current', 'theme'), { recursive: true });
    fs.mkdirSync(path.join(mockHomeDir, '.config', 'nvim'), { recursive: true });
    fs.mkdirSync(path.join(mockHomeDir, '.config'), { recursive: true });
    fs.mkdirSync(path.join(mockHomeDir, 'Library', 'Application Support', 'Ricekit', 'current', 'theme'), { recursive: true });

    // Reset mocks
    vi.clearAllMocks();

    // Configure default existsSync behavior
    vi.mocked(mockExistsSync).mockImplementation((filePath) => {
      const filePathStr = String(filePath);
      // Translate real home directory paths to test directory paths
      let testPath = filePathStr;
      if (filePathStr.startsWith(realHomeDir)) {
        testPath = filePathStr.replace(realHomeDir, mockHomeDir);
      }
      // Check the test filesystem
      return fs.existsSync(testPath);
    });
  });

  afterEach(() => {
    // Clean up test directories
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('handleSetupApp', () => {
    it('should return created action when no config exists', async () => {
      // Mock core setupApp to return 'created' action
      vi.mocked(coreSetupApp).mockResolvedValue({
        success: true,
        data: {
          action: 'created',
          configPath: path.join(mockHomeDir, '.config', 'wezterm', 'wezterm.lua'),
          message: 'Created wezterm config',
        },
      });

      const result = await handleSetupApp(null, 'wezterm');

      expect(result.action).toBe('created');
      expect(result.configPath).toContain('wezterm.lua');

      // Should have added to enabledApps
      expect(handleSetPreferences).toHaveBeenCalled();
    });

    it('should copy snippet to clipboard when config exists', async () => {
      const snippet = '-- Ricekit WezTerm integration\nlocal colors_path = ...';

      // Mock core setupApp to return 'clipboard' action
      vi.mocked(coreSetupApp).mockResolvedValue({
        success: true,
        data: {
          action: 'clipboard',
          configPath: path.join(mockHomeDir, '.config', 'wezterm', 'wezterm.lua'),
          snippet,
          instructions: 'Add this after your config = wezterm.config_builder() line:',
          message: 'wezterm config exists. Add the integration snippet to your config.',
        },
      });

      const result = await handleSetupApp(null, 'wezterm');

      expect(result.action).toBe('clipboard');
      expect(result.snippet).toBe(snippet);

      // Should have copied to clipboard
      expect(clipboard.writeText).toHaveBeenCalledWith(snippet);

      // Should have added to enabledApps
      expect(handleSetPreferences).toHaveBeenCalled();
    });

    it('should return already_setup when Ricekit integration exists', async () => {
      // Mock core setupApp to return 'already_setup' action
      vi.mocked(coreSetupApp).mockResolvedValue({
        success: true,
        data: {
          action: 'already_setup',
          configPath: path.join(mockHomeDir, '.config', 'wezterm', 'wezterm.lua'),
          message: 'wezterm is already configured with Ricekit integration.',
        },
      });

      const result = await handleSetupApp(null, 'wezterm');

      expect(result.action).toBe('already_setup');

      // Should still ensure app is in enabledApps
      expect(handleSetPreferences).toHaveBeenCalled();
    });

    it('should throw error for unsupported app', async () => {
      // Mock core setupApp to return error
      vi.mocked(coreSetupApp).mockResolvedValue({
        success: false,
        error: new Error('Unsupported app: unknown-app'),
      });

      await expect(handleSetupApp(null, 'unknown-app')).rejects.toThrow(
        'Unsupported app: unknown-app'
      );
    });

  });
});
