import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';

const testDir = path.join(os.tmpdir(), 'flowstate-app-test-' + Date.now());
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
      notifications: { onScheduledSwitch: true },
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

// Import after mocks are set up
import {
  existsSync as mockExistsSync,
} from '../utils/asyncFs';
import { handleGetPreferences, handleSetPreferences } from '../handlers/preferencesHandlers';
import { shell, clipboard } from 'electron';
import {
  handleDetectApps,
  handleSetupApp,
  setThemeHandlers,
} from '../handlers/appHandlers';
import { setupApp as coreSetupApp } from '../../core/apps/setup';

// Real home directory (captured before mocks)
const realHomeDir = os.homedir();

describe('appHandlers', () => {
  beforeEach(() => {
    // Create test directories
    fs.mkdirSync(path.join(testDir, 'appdata', 'Flowstate', 'current', 'theme'), { recursive: true });
    fs.mkdirSync(path.join(mockHomeDir, '.config', 'alacritty'), { recursive: true });
    fs.mkdirSync(path.join(mockHomeDir, '.config', 'kitty'), { recursive: true });
    fs.mkdirSync(path.join(mockHomeDir, '.config', 'nvim'), { recursive: true });
    fs.mkdirSync(path.join(mockHomeDir, '.config'), { recursive: true });
    fs.mkdirSync(path.join(mockHomeDir, 'Library', 'Application Support', 'Code', 'User'), { recursive: true });
    fs.mkdirSync(path.join(mockHomeDir, 'Library', 'Application Support', 'Cursor', 'User'), { recursive: true });
    fs.mkdirSync(path.join(mockHomeDir, 'Library', 'Application Support', 'Flowstate', 'current', 'theme'), { recursive: true });

    // Reset mocks
    vi.clearAllMocks();

    // Set up theme handlers mock
    setThemeHandlers({
      getTheme: vi.fn(() => Promise.resolve({
        name: 'test-theme',
        path: '/test/path',
        metadata: {
          name: 'test-theme',
          author: 'Test',
          description: 'Test theme',
          version: '1.0.0',
          colors: {
            background: '#1a1b26',
            foreground: '#c0caf5',
            cursor: '#c0caf5',
            selection: '#33467c',
            black: '#15161e',
            red: '#f7768e',
            green: '#9ece6a',
            yellow: '#e0af68',
            blue: '#7aa2f7',
            magenta: '#bb9af7',
            cyan: '#7dcfff',
            white: '#a9b1d6',
            brightBlack: '#414868',
            brightRed: '#f7768e',
            brightGreen: '#9ece6a',
            brightYellow: '#e0af68',
            brightBlue: '#7aa2f7',
            brightMagenta: '#bb9af7',
            brightCyan: '#7dcfff',
            brightWhite: '#c0caf5',
            accent: '#7aa2f7',
            border: '#414868',
          },
        },
        isCustom: false,
        isLight: false,
      })),
      updateVSCodeSettings: vi.fn(() => Promise.resolve()),
      updateCursorSettings: vi.fn(() => Promise.resolve()),
    });

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
          configPath: path.join(mockHomeDir, '.config', 'alacritty', 'alacritty.toml'),
          message: 'Created alacritty config',
        },
      });

      const result = await handleSetupApp(null, 'alacritty');

      expect(result.action).toBe('created');
      expect(result.configPath).toContain('alacritty.toml');

      // Should have added to enabledApps
      expect(handleSetPreferences).toHaveBeenCalled();
    });

    it('should copy snippet to clipboard when config exists', async () => {
      const snippet = 'import = ["~/Library/Application Support/Flowstate/current/theme/alacritty.toml"]';

      // Mock core setupApp to return 'clipboard' action
      vi.mocked(coreSetupApp).mockResolvedValue({
        success: true,
        data: {
          action: 'clipboard',
          configPath: path.join(mockHomeDir, '.config', 'kitty', 'kitty.conf'),
          snippet,
          instructions: 'Add this at the top of your kitty.conf:',
          message: 'kitty config exists. Add the integration snippet to your config.',
        },
      });

      const result = await handleSetupApp(null, 'kitty');

      expect(result.action).toBe('clipboard');
      expect(result.snippet).toBe(snippet);

      // Should have copied to clipboard
      expect(clipboard.writeText).toHaveBeenCalledWith(snippet);

      // Should have added to enabledApps
      expect(handleSetPreferences).toHaveBeenCalled();
    });

    it('should return already_setup when Flowstate integration exists', async () => {
      // Mock core setupApp to return 'already_setup' action
      vi.mocked(coreSetupApp).mockResolvedValue({
        success: true,
        data: {
          action: 'already_setup',
          configPath: path.join(mockHomeDir, '.config', 'alacritty', 'alacritty.toml'),
          message: 'alacritty is already configured with Flowstate integration.',
        },
      });

      const result = await handleSetupApp(null, 'alacritty');

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

    it('should open slack theme file and show notification for slack setup', async () => {
      // Create the slack theme file
      const themePath = path.join(
        mockHomeDir,
        'Library',
        'Application Support',
        'Flowstate',
        'current',
        'theme',
        'slack-theme.txt'
      );
      fs.mkdirSync(path.dirname(themePath), { recursive: true });
      fs.writeFileSync(themePath, '#FFFFFF,#FFFFFF,#FFFFFF,#FFFFFF');

      vi.mocked(mockExistsSync).mockImplementation((filePath) => {
        const filePathStr = String(filePath);
        if (filePathStr.includes('slack-theme.txt')) {
          return true;
        }
        return false;
      });

      const result = await handleSetupApp(null, 'slack');

      expect(result.action).toBe('special');

      // Should have opened the theme file
      expect(shell.openPath).toHaveBeenCalled();

      // Should have added slack to enabledApps
      expect(handleSetPreferences).toHaveBeenCalled();
    });

    it('should throw error for slack if theme file does not exist', async () => {
      vi.mocked(mockExistsSync).mockReturnValue(false);

      await expect(handleSetupApp(null, 'slack')).rejects.toThrow(
        'Slack theme file not found. Please apply a theme first.'
      );
    });

    it('should return special action for vscode', async () => {
      const result = await handleSetupApp(null, 'vscode');

      expect(result.action).toBe('special');
      expect(result.message).toContain('VS Code');

      // Should have added to enabledApps
      expect(handleSetPreferences).toHaveBeenCalled();
    });

    it('should return special action for cursor', async () => {
      const result = await handleSetupApp(null, 'cursor');

      expect(result.action).toBe('special');
      expect(result.message).toContain('Cursor');

      // Should have added to enabledApps
      expect(handleSetPreferences).toHaveBeenCalled();
    });
  });
});
