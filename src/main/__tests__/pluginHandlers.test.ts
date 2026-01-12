import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';

const testDir = path.join(os.tmpdir(), 'mactheme-plugin-test-' + Date.now());
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
    openExternal: vi.fn(),
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
  execSync: vi.fn((cmd: string) => {
    if (cmd.includes('--version')) {
      return '1.0.0\n';
    }
    return '';
  }),
}));

// Mock asyncFs to control file existence checks
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
    })
  ),
  handleSetPreferences: vi.fn(() => Promise.resolve()),
}));

// Mock presetInstaller
vi.mock('../presetInstaller', () => ({
  listPresets: vi.fn(() =>
    Promise.resolve([
      { name: 'minimal', displayName: 'Minimal', description: 'Minimal preset', features: [] },
      { name: 'pro', displayName: 'Pro', description: 'Pro preset', features: [] },
    ])
  ),
  setActivePreset: vi.fn(() => Promise.resolve()),
  getActivePreset: vi.fn(() => Promise.resolve('minimal')),
}));

// Import after mocks are set up
import {
  handleGetPluginStatus,
  handleListPresets,
  handleGetPluginConfig,
  handleResetPluginToCustom,
  handleSetPreset,
} from '../handlers/pluginHandlers';
import { handleGetPreferences, handleSetPreferences } from '../handlers/preferencesHandlers';
import {
  existsSync as mockExistsSync,
  writeFile as mockWriteFile,
  readFile as mockReadFile,
} from '../utils/asyncFs';

// Binary paths that should NOT exist by default in tests
const BINARY_PATHS = [
  '/opt/homebrew/bin/sketchybar',
  '/usr/local/bin/sketchybar',
  '/opt/homebrew/bin/aerospace',
  '/usr/local/bin/aerospace',
  '/Applications/AeroSpace.app/Contents/MacOS/AeroSpace',
  '/opt/homebrew/bin/brew',
  '/usr/local/bin/brew',
  // CLI plugins
  '/opt/homebrew/bin/starship',
  '/usr/local/bin/starship',
  '/opt/homebrew/bin/tmux',
  '/usr/local/bin/tmux',
  '/opt/homebrew/bin/bat',
  '/usr/local/bin/bat',
  '/opt/homebrew/bin/delta',
  '/usr/local/bin/delta',
];

// Real home directory (captured before mocks)
const realHomeDir = os.homedir();

describe('pluginHandlers', () => {
  beforeEach(() => {
    // Create test directories
    fs.mkdirSync(path.join(testDir, 'appdata', 'MacTheme', 'presets'), { recursive: true });
    fs.mkdirSync(path.join(testDir, 'appdata', 'MacTheme', 'current', 'presets'), { recursive: true });
    fs.mkdirSync(path.join(testDir, 'appdata', 'MacTheme', 'current', 'theme'), { recursive: true });
    fs.mkdirSync(path.join(mockHomeDir, '.config', 'sketchybar'), { recursive: true });
    fs.mkdirSync(path.join(mockHomeDir, '.config', 'aerospace'), { recursive: true });

    // Reset mocks
    vi.clearAllMocks();

    // Configure existsSync mock: binaries don't exist, translate home paths to test paths
    vi.mocked(mockExistsSync).mockImplementation((filePath) => {
      const filePathStr = String(filePath);
      // Binary paths should not exist in tests
      if (BINARY_PATHS.includes(filePathStr)) {
        return false;
      }
      // Translate real home directory paths to test directory paths
      // (PLUGIN_DEFINITIONS uses real os.homedir() at module load time)
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

  describe('handleGetPluginStatus', () => {
    it('should return not installed status when binary not found', async () => {
      const status = await handleGetPluginStatus(null, 'sketchybar');

      expect(status.isInstalled).toBe(false);
      expect(status.binaryPath).toBeUndefined();
      expect(status.hasExistingConfig).toBe(false);
      expect(status.configPath).toContain('.config/sketchybar');
    });

    it('should detect existing config when sketchybarrc exists', async () => {
      // Create a config file
      const configPath = path.join(mockHomeDir, '.config', 'sketchybar', 'sketchybarrc');
      fs.writeFileSync(configPath, '# existing config');

      const status = await handleGetPluginStatus(null, 'sketchybar');

      expect(status.hasExistingConfig).toBe(true);
    });

    it('should throw error for unknown plugin', async () => {
      await expect(handleGetPluginStatus(null, 'unknown')).rejects.toThrow('Unknown plugin: unknown');
    });

    it('should return aerospace status', async () => {
      const status = await handleGetPluginStatus(null, 'aerospace');

      expect(status.isInstalled).toBe(false);
      expect(status.configPath).toContain('.config/aerospace');
    });
  });

  describe('handleListPresets', () => {
    it('should return available presets for a plugin', async () => {
      const presets = await handleListPresets(null, 'sketchybar');

      expect(presets.length).toBe(2);
      expect(presets[0].name).toBe('minimal');
      expect(presets[1].name).toBe('pro');
    });
  });

  describe('handleGetPluginConfig', () => {
    it('should return null when no config exists', async () => {
      const config = await handleGetPluginConfig(null, 'sketchybar');
      expect(config).toBeNull();
    });

    it('should return config when it exists in preferences', async () => {
      vi.mocked(handleGetPreferences).mockResolvedValueOnce({
        enabledApps: ['sketchybar'],
        pluginConfigs: {
          sketchybar: {
            mode: 'preset',
            preset: 'minimal',
            installedBy: 'mactheme',
          },
        },
        favorites: [],
        recentThemes: [],
        keyboardShortcuts: { quickSwitcher: 'Cmd+Shift+T' },
        startAtLogin: false,
        showInMenuBar: true,
        showNotifications: true,
        notifications: { onThemeChange: true, onScheduledSwitch: true },
        onboardingCompleted: false,
      });

      const config = await handleGetPluginConfig(null, 'sketchybar');

      expect(config).not.toBeNull();
      expect(config?.mode).toBe('preset');
      expect(config?.preset).toBe('minimal');
      expect(config?.installedBy).toBe('mactheme');
    });
  });

  describe('handleResetPluginToCustom', () => {
    it('should update preferences to custom mode', async () => {
      vi.mocked(handleGetPreferences).mockResolvedValueOnce({
        enabledApps: ['sketchybar'],
        pluginConfigs: {
          sketchybar: {
            mode: 'preset',
            preset: 'minimal',
            installedBy: 'mactheme',
          },
        },
        favorites: [],
        recentThemes: [],
        keyboardShortcuts: { quickSwitcher: 'Cmd+Shift+T' },
        startAtLogin: false,
        showInMenuBar: true,
        showNotifications: true,
        notifications: { onThemeChange: true, onScheduledSwitch: true },
        onboardingCompleted: false,
      });

      await handleResetPluginToCustom(null, 'sketchybar');

      expect(handleSetPreferences).toHaveBeenCalled();
      const setPrefsCall = vi.mocked(handleSetPreferences).mock.calls[0];
      const updatedPrefs = setPrefsCall[1];
      expect(updatedPrefs.pluginConfigs?.sketchybar?.mode).toBe('custom');
      expect(updatedPrefs.pluginConfigs?.sketchybar?.preset).toBeUndefined();
    });

    it('should throw error for unknown plugin', async () => {
      await expect(handleResetPluginToCustom(null, 'unknown')).rejects.toThrow(
        'Unknown plugin: unknown'
      );
    });
  });
});

describe('pluginHandlers - PLUGIN_DEFINITIONS', () => {
  it('should have correct sketchybar definition', async () => {
    const status = await handleGetPluginStatus(null, 'sketchybar');
    expect(status.configPath).toContain('sketchybar');
  });

  it('should have correct aerospace definition', async () => {
    const status = await handleGetPluginStatus(null, 'aerospace');
    expect(status.configPath).toContain('aerospace');
  });

  it('should have correct starship definition', async () => {
    const status = await handleGetPluginStatus(null, 'starship');
    // configPath is the configDir (~/.config), mainConfigFile is starship.toml
    expect(status.configPath).toContain('.config');
    expect(status.isInstalled).toBe(false);
  });

  it('should have correct tmux definition', async () => {
    const status = await handleGetPluginStatus(null, 'tmux');
    // configPath is home directory, mainConfigFile is .tmux.conf
    expect(status.configPath).toBeDefined();
    expect(status.isInstalled).toBe(false);
  });

  it('should have correct bat definition', async () => {
    const status = await handleGetPluginStatus(null, 'bat');
    // configPath is ~/.config/bat, mainConfigFile is config
    expect(status.configPath).toContain('bat');
    expect(status.isInstalled).toBe(false);
  });

  it('should have correct delta definition', async () => {
    const status = await handleGetPluginStatus(null, 'delta');
    // configPath is home directory, mainConfigFile is .gitconfig
    expect(status.configPath).toBeDefined();
    expect(status.isInstalled).toBe(false);
  });
});

describe('pluginHandlers - generateWrapperConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset writeFile mock to track calls
    vi.mocked(mockWriteFile).mockResolvedValue(undefined);
  });

  it('should generate starship wrapper config with TOML format', async () => {
    // Setup: mock preferences
    vi.mocked(handleGetPreferences).mockResolvedValue({
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
    });

    await handleSetPreset(null, 'starship', 'minimal');

    // Check that writeFile was called with TOML content
    const writeFileCalls = vi.mocked(mockWriteFile).mock.calls;
    const starshipConfigCall = writeFileCalls.find(
      (call) => String(call[0]).includes('starship.toml')
    );

    expect(starshipConfigCall).toBeDefined();
    const content = String(starshipConfigCall![1]);
    expect(content).toContain('# MacTheme Starship Configuration');
    expect(content).toContain('"$include"');
    expect(content).toContain('starship-overrides.toml');
  });

  it('should generate tmux wrapper config with source-file directives', async () => {
    vi.mocked(handleGetPreferences).mockResolvedValue({
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
    });

    await handleSetPreset(null, 'tmux', 'minimal');

    const writeFileCalls = vi.mocked(mockWriteFile).mock.calls;
    const tmuxConfigCall = writeFileCalls.find((call) => String(call[0]).includes('.tmux.conf'));

    expect(tmuxConfigCall).toBeDefined();
    const content = String(tmuxConfigCall![1]);
    expect(content).toContain('# MacTheme tmux Configuration');
    expect(content).toContain('source-file');
    expect(content).toContain('tmux-colors.conf');
    expect(content).toContain('.tmux-overrides.conf');
  });

  it('should generate bat wrapper config with inline options', async () => {
    vi.mocked(handleGetPreferences).mockResolvedValue({
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
    });

    // Mock existsSync to return true for preset config path
    vi.mocked(mockExistsSync).mockImplementation((filePath) => {
      const filePathStr = String(filePath);
      // Allow preset config paths to exist
      if (filePathStr.includes('presets') && filePathStr.includes('bat')) {
        return true;
      }
      return false;
    });

    // Mock reading the preset config file
    vi.mocked(mockReadFile).mockResolvedValue('--style=plain\n--paging=never');

    await handleSetPreset(null, 'bat', 'minimal');

    const writeFileCalls = vi.mocked(mockWriteFile).mock.calls;
    const batConfigCall = writeFileCalls.find(
      (call) => String(call[0]).includes('bat') && String(call[0]).endsWith('config')
    );

    expect(batConfigCall).toBeDefined();
    const content = String(batConfigCall![1]);
    expect(content).toContain('# MacTheme bat Configuration');
    // bat copies preset content inline since it doesn't support includes
    expect(content).toContain('--');
  });

  it('should generate delta config by merging into .gitconfig', async () => {
    vi.mocked(handleGetPreferences).mockResolvedValue({
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
    });

    // Mock existsSync for delta preset paths
    vi.mocked(mockExistsSync).mockImplementation((filePath) => {
      const filePathStr = String(filePath);
      // Allow preset gitconfig paths to exist
      if (filePathStr.includes('presets') && filePathStr.includes('delta')) {
        return true;
      }
      // Allow .gitconfig to exist
      if (filePathStr.endsWith('.gitconfig')) {
        return true;
      }
      return false;
    });

    // Mock existing .gitconfig
    vi.mocked(mockReadFile).mockImplementation(async (filePath: string) => {
      if (filePath.endsWith('.gitconfig') && !filePath.includes('presets')) {
        return `[user]
    name = Test User
    email = test@example.com

[core]
    editor = vim
`;
      }
      // Return delta preset content
      return `[delta]
    syntax-theme = ansi
    line-numbers = false
`;
    });

    await handleSetPreset(null, 'delta', 'minimal');

    const writeFileCalls = vi.mocked(mockWriteFile).mock.calls;
    const gitconfigCall = writeFileCalls.find((call) => String(call[0]).includes('.gitconfig'));

    expect(gitconfigCall).toBeDefined();
    const content = String(gitconfigCall![1]);
    // Should preserve existing sections
    expect(content).toContain('[user]');
    expect(content).toContain('name = Test User');
    expect(content).toContain('[core]');
    // Should add delta section
    expect(content).toContain('[delta]');
  });

  it('should preserve existing .gitconfig content when adding delta section', async () => {
    vi.mocked(handleGetPreferences).mockResolvedValue({
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
    });

    // Mock existsSync for delta preset paths
    vi.mocked(mockExistsSync).mockImplementation((filePath) => {
      const filePathStr = String(filePath);
      // Allow preset gitconfig paths to exist
      if (filePathStr.includes('presets') && filePathStr.includes('delta')) {
        return true;
      }
      // Allow .gitconfig to exist
      if (filePathStr.endsWith('.gitconfig')) {
        return true;
      }
      return false;
    });

    // Mock existing .gitconfig with existing delta section
    vi.mocked(mockReadFile).mockImplementation(async (filePath: string) => {
      if (filePath.endsWith('.gitconfig') && !filePath.includes('presets')) {
        return `[user]
    name = Test User

[delta]
    old-setting = true

[alias]
    co = checkout
`;
      }
      return `[delta]
    syntax-theme = ansi
`;
    });

    await handleSetPreset(null, 'delta', 'minimal');

    const writeFileCalls = vi.mocked(mockWriteFile).mock.calls;
    const gitconfigCall = writeFileCalls.find((call) => String(call[0]).includes('.gitconfig'));

    expect(gitconfigCall).toBeDefined();
    const content = String(gitconfigCall![1]);
    // Should preserve other sections
    expect(content).toContain('[user]');
    expect(content).toContain('[alias]');
    // Old delta setting should be replaced
    expect(content).not.toContain('old-setting');
  });
});
