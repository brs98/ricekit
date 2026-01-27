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

// Import after mocks are set up
import {
  existsSync as mockExistsSync,
  readFile as mockReadFile,
  writeFile as mockWriteFile,
  ensureDir as mockEnsureDir,
  copyFile as mockCopyFile,
} from '../utils/asyncFs';
import { handleGetPreferences, handleSetPreferences } from '../handlers/preferencesHandlers';
import { shell } from 'electron';
import {
  handleDetectApps,
  handleSetupApp,
  setThemeHandlers,
} from '../handlers/appHandlers';

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
    it('should add import line to alacritty config and create backup', async () => {
      // Create an existing alacritty config
      const configPath = path.join(mockHomeDir, '.config', 'alacritty', 'alacritty.toml');
      fs.writeFileSync(configPath, '# Existing alacritty config\n[window]\ndecorations = "full"\n');

      // Mock existsSync to find the config
      vi.mocked(mockExistsSync).mockImplementation((filePath) => {
        const filePathStr = String(filePath);
        if (filePathStr.includes('alacritty.toml')) {
          return true;
        }
        if (filePathStr.includes('Flowstate/current/theme')) {
          return false;
        }
        return false;
      });

      // Mock readFile to return existing config
      vi.mocked(mockReadFile).mockResolvedValue('# Existing alacritty config\n[window]\ndecorations = "full"\n');

      await handleSetupApp(null, 'alacritty');

      // Should have created backup
      expect(mockCopyFile).toHaveBeenCalled();

      // Should have written new config with import at top
      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = vi.mocked(mockWriteFile).mock.calls[0];
      const newContent = String(writeCall[1]);
      expect(newContent).toContain('import = ["~/Library/Application Support/Flowstate/current/theme/alacritty.toml"]');
      expect(newContent).toContain('# Existing alacritty config');

      // Should have added to enabledApps
      expect(handleSetPreferences).toHaveBeenCalled();
    });

    it('should add include line to kitty config', async () => {
      const configPath = path.join(mockHomeDir, '.config', 'kitty', 'kitty.conf');
      fs.writeFileSync(configPath, '# Existing kitty config\nfont_size 12\n');

      vi.mocked(mockExistsSync).mockImplementation((filePath) => {
        const filePathStr = String(filePath);
        if (filePathStr.includes('kitty.conf')) {
          return true;
        }
        return false;
      });

      vi.mocked(mockReadFile).mockResolvedValue('# Existing kitty config\nfont_size 12\n');

      await handleSetupApp(null, 'kitty');

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = vi.mocked(mockWriteFile).mock.calls[0];
      const newContent = String(writeCall[1]);
      expect(newContent).toContain('include ~/Library/Application Support/Flowstate/current/theme/kitty.conf');
    });

    it('should add dofile line to neovim config', async () => {
      const configDir = path.join(mockHomeDir, '.config', 'nvim');
      const configPath = path.join(configDir, 'init.lua');
      fs.writeFileSync(configPath, '-- Existing neovim config\nvim.opt.number = true\n');

      vi.mocked(mockExistsSync).mockImplementation((filePath) => {
        const filePathStr = String(filePath);
        if (filePathStr.includes('init.lua')) {
          return true;
        }
        return false;
      });

      vi.mocked(mockReadFile).mockResolvedValue('-- Existing neovim config\nvim.opt.number = true\n');

      await handleSetupApp(null, 'neovim');

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = vi.mocked(mockWriteFile).mock.calls[0];
      const newContent = String(writeCall[1]);
      expect(newContent).toContain('dofile(vim.fn.expand("~/Library/Application Support/Flowstate/current/theme/neovim.lua"))');
    });

    it('should throw error if Flowstate import already exists', async () => {
      const configPath = path.join(mockHomeDir, '.config', 'alacritty', 'alacritty.toml');
      fs.writeFileSync(configPath, 'import = ["~/Library/Application Support/Flowstate/current/theme/alacritty.toml"]\n');

      vi.mocked(mockExistsSync).mockImplementation((filePath) => {
        const filePathStr = String(filePath);
        if (filePathStr.includes('alacritty.toml')) {
          return true;
        }
        return false;
      });

      vi.mocked(mockReadFile).mockResolvedValue(
        'import = ["~/Library/Application Support/Flowstate/current/theme/alacritty.toml"]\n'
      );

      await expect(handleSetupApp(null, 'alacritty')).rejects.toThrow(
        'Flowstate import already exists in config file'
      );
    });

    it('should create config directory if it does not exist', async () => {
      // Config file doesn't exist
      vi.mocked(mockExistsSync).mockReturnValue(false);

      await handleSetupApp(null, 'alacritty');

      // Should have called ensureDir to create config directory
      expect(mockEnsureDir).toHaveBeenCalled();

      // Should have written new config
      expect(mockWriteFile).toHaveBeenCalled();
    });

    it('should throw error for unsupported app', async () => {
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

      await handleSetupApp(null, 'slack');

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

    it('should add starship include to config', async () => {
      const configPath = path.join(mockHomeDir, '.config', 'starship.toml');
      fs.writeFileSync(configPath, '# Existing starship config\n[character]\nsuccess_symbol = "[>](green)"\n');

      vi.mocked(mockExistsSync).mockImplementation((filePath) => {
        const filePathStr = String(filePath);
        if (filePathStr.includes('starship.toml')) {
          return true;
        }
        return false;
      });

      vi.mocked(mockReadFile).mockResolvedValue(
        '# Existing starship config\n[character]\nsuccess_symbol = "[>](green)"\n'
      );

      await handleSetupApp(null, 'starship');

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = vi.mocked(mockWriteFile).mock.calls[0];
      const newContent = String(writeCall[1]);
      expect(newContent).toContain('"$include"');
      expect(newContent).toContain('Flowstate/current/theme/starship.toml');
    });
  });
});
