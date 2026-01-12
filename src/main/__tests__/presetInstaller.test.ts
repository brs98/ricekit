import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';

const testDir = path.join(os.tmpdir(), 'mactheme-preset-test-' + Date.now());
const presetsDir = path.join(testDir, 'presets');
const currentPresetsDir = path.join(testDir, 'current', 'presets');

// Mock the electron app module
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name: string) => {
      if (name === 'appData') {
        return testDir;
      }
      return os.tmpdir();
    }),
  },
}));

// Mock the logger
vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock directories to use test paths
vi.mock('../directories', () => ({
  getPresetsDir: () => presetsDir,
  getCurrentPresetsDir: () => currentPresetsDir,
  getAppDataDir: () => testDir,
  getCurrentDir: () => path.join(testDir, 'current'),
}));

// Import after mocks are set up
import {
  listPresets,
  setActivePreset,
  getActivePreset,
  isSupportedPlugin,
  getSupportedPlugins,
} from '../presetInstaller';

describe('presetInstaller', () => {
  beforeEach(() => {
    // Create test directories
    fs.mkdirSync(presetsDir, { recursive: true });
    fs.mkdirSync(currentPresetsDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directories
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('isSupportedPlugin', () => {
    it('should return true for sketchybar', () => {
      expect(isSupportedPlugin('sketchybar')).toBe(true);
    });

    it('should return true for aerospace', () => {
      expect(isSupportedPlugin('aerospace')).toBe(true);
    });

    it('should return false for unsupported plugins', () => {
      expect(isSupportedPlugin('unknown')).toBe(false);
      expect(isSupportedPlugin('alacritty')).toBe(false);
    });
  });

  describe('getSupportedPlugins', () => {
    it('should return array of supported plugin names', () => {
      const plugins = getSupportedPlugins();
      expect(plugins).toContain('sketchybar');
      expect(plugins).toContain('aerospace');
      expect(plugins.length).toBe(2);
    });
  });

  describe('listPresets', () => {
    it('should return empty array when no presets exist', async () => {
      const presets = await listPresets('sketchybar');
      expect(presets).toEqual([]);
    });

    it('should list presets with metadata from preset.json', async () => {
      // Create a test preset with metadata
      const presetDir = path.join(presetsDir, 'sketchybar', 'minimal');
      fs.mkdirSync(presetDir, { recursive: true });
      fs.writeFileSync(
        path.join(presetDir, 'preset.json'),
        JSON.stringify({
          name: 'minimal',
          displayName: 'Minimal',
          description: 'A minimal preset',
          features: ['feature1', 'feature2'],
        })
      );

      const presets = await listPresets('sketchybar');
      expect(presets.length).toBe(1);
      expect(presets[0]).toEqual({
        name: 'minimal',
        displayName: 'Minimal',
        description: 'A minimal preset',
        features: ['feature1', 'feature2'],
      });
    });

    it('should use fallback metadata when preset.json is missing', async () => {
      // Create a preset directory without preset.json
      const presetDir = path.join(presetsDir, 'sketchybar', 'custom');
      fs.mkdirSync(presetDir, { recursive: true });
      // Create at least one file so the directory is recognized as a preset
      fs.writeFileSync(path.join(presetDir, 'sketchybarrc'), '# config');

      const presets = await listPresets('sketchybar');
      expect(presets.length).toBe(1);
      expect(presets[0].name).toBe('custom');
      expect(presets[0].displayName).toBe('Custom');
      expect(presets[0].description).toContain('custom preset for sketchybar');
    });

    it('should list multiple presets', async () => {
      // Create multiple presets
      const preset1Dir = path.join(presetsDir, 'sketchybar', 'minimal');
      const preset2Dir = path.join(presetsDir, 'sketchybar', 'pro');
      fs.mkdirSync(preset1Dir, { recursive: true });
      fs.mkdirSync(preset2Dir, { recursive: true });
      fs.writeFileSync(
        path.join(preset1Dir, 'preset.json'),
        JSON.stringify({ name: 'minimal', displayName: 'Minimal', description: 'Minimal', features: [] })
      );
      fs.writeFileSync(
        path.join(preset2Dir, 'preset.json'),
        JSON.stringify({ name: 'pro', displayName: 'Pro', description: 'Pro', features: [] })
      );

      const presets = await listPresets('sketchybar');
      expect(presets.length).toBe(2);
      expect(presets.map((p) => p.name).sort()).toEqual(['minimal', 'pro']);
    });
  });

  describe('setActivePreset', () => {
    it('should throw error for non-existent preset', async () => {
      await expect(setActivePreset('sketchybar', 'nonexistent')).rejects.toThrow(
        'Preset not found: sketchybar/nonexistent'
      );
    });

    it('should create symlink to preset directory', async () => {
      // Create a preset
      const presetDir = path.join(presetsDir, 'sketchybar', 'minimal');
      fs.mkdirSync(presetDir, { recursive: true });
      fs.writeFileSync(path.join(presetDir, 'sketchybarrc'), '# config');

      await setActivePreset('sketchybar', 'minimal');

      const symlinkPath = path.join(currentPresetsDir, 'sketchybar');
      expect(fs.existsSync(symlinkPath)).toBe(true);
      expect(fs.lstatSync(symlinkPath).isSymbolicLink()).toBe(true);

      const target = fs.readlinkSync(symlinkPath);
      expect(target).toBe(presetDir);
    });

    it('should replace existing symlink when switching presets', async () => {
      // Create two presets
      const preset1Dir = path.join(presetsDir, 'sketchybar', 'minimal');
      const preset2Dir = path.join(presetsDir, 'sketchybar', 'pro');
      fs.mkdirSync(preset1Dir, { recursive: true });
      fs.mkdirSync(preset2Dir, { recursive: true });
      fs.writeFileSync(path.join(preset1Dir, 'sketchybarrc'), '# minimal');
      fs.writeFileSync(path.join(preset2Dir, 'sketchybarrc'), '# pro');

      // Set first preset
      await setActivePreset('sketchybar', 'minimal');
      let target = fs.readlinkSync(path.join(currentPresetsDir, 'sketchybar'));
      expect(target).toBe(preset1Dir);

      // Switch to second preset
      await setActivePreset('sketchybar', 'pro');
      target = fs.readlinkSync(path.join(currentPresetsDir, 'sketchybar'));
      expect(target).toBe(preset2Dir);
    });
  });

  describe('getActivePreset', () => {
    it('should return null when no preset is active', async () => {
      const active = await getActivePreset('sketchybar');
      expect(active).toBeNull();
    });

    it('should return the active preset name', async () => {
      // Create and set a preset
      const presetDir = path.join(presetsDir, 'sketchybar', 'minimal');
      fs.mkdirSync(presetDir, { recursive: true });
      fs.writeFileSync(path.join(presetDir, 'sketchybarrc'), '# config');
      await setActivePreset('sketchybar', 'minimal');

      const active = await getActivePreset('sketchybar');
      expect(active).toBe('minimal');
    });

    it('should return null for non-symlink paths', async () => {
      // Create a regular directory instead of a symlink
      const fakePath = path.join(currentPresetsDir, 'aerospace');
      fs.mkdirSync(fakePath, { recursive: true });

      const active = await getActivePreset('aerospace');
      expect(active).toBeNull();
    });
  });
});
