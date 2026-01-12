import { describe, it, expect } from 'vitest';
import type {
  PluginConfig,
  PresetInfo,
  PluginStatus,
  PluginMode,
  InstalledBy,
  Preferences,
} from '../types';

describe('Plugin Types', () => {
  describe('PluginConfig', () => {
    it('should accept valid preset mode config', () => {
      const config: PluginConfig = {
        mode: 'preset',
        preset: 'minimal',
        installedBy: 'mactheme',
        lastUpdated: Date.now(),
      };

      expect(config.mode).toBe('preset');
      expect(config.preset).toBe('minimal');
      expect(config.installedBy).toBe('mactheme');
    });

    it('should accept valid custom mode config', () => {
      const config: PluginConfig = {
        mode: 'custom',
        installedBy: 'user',
        configBackupPath: '/path/to/backup',
      };

      expect(config.mode).toBe('custom');
      expect(config.preset).toBeUndefined();
      expect(config.installedBy).toBe('user');
    });

    it('should accept all installedBy values', () => {
      const byMactheme: InstalledBy = 'mactheme';
      const byUser: InstalledBy = 'user';
      const byUnknown: InstalledBy = 'unknown';

      expect(byMactheme).toBe('mactheme');
      expect(byUser).toBe('user');
      expect(byUnknown).toBe('unknown');
    });
  });

  describe('PresetInfo', () => {
    it('should accept valid preset info', () => {
      const preset: PresetInfo = {
        name: 'minimal',
        displayName: 'Minimal',
        description: 'A minimal preset',
        features: ['feature1', 'feature2'],
      };

      expect(preset.name).toBe('minimal');
      expect(preset.displayName).toBe('Minimal');
      expect(preset.features).toHaveLength(2);
    });

    it('should accept preset info with optional previewImage', () => {
      const preset: PresetInfo = {
        name: 'pro',
        displayName: 'Pro',
        description: 'A pro preset',
        features: [],
        previewImage: '/path/to/preview.png',
      };

      expect(preset.previewImage).toBe('/path/to/preview.png');
    });
  });

  describe('PluginStatus', () => {
    it('should accept installed status', () => {
      const status: PluginStatus = {
        isInstalled: true,
        binaryPath: '/opt/homebrew/bin/sketchybar',
        version: '2.15.0',
        hasExistingConfig: true,
        configPath: '~/.config/sketchybar',
      };

      expect(status.isInstalled).toBe(true);
      expect(status.binaryPath).toBeDefined();
      expect(status.version).toBe('2.15.0');
    });

    it('should accept not installed status', () => {
      const status: PluginStatus = {
        isInstalled: false,
        hasExistingConfig: false,
        configPath: '~/.config/sketchybar',
      };

      expect(status.isInstalled).toBe(false);
      expect(status.binaryPath).toBeUndefined();
      expect(status.version).toBeUndefined();
    });
  });

  describe('Preferences with pluginConfigs', () => {
    it('should accept preferences with empty pluginConfigs', () => {
      const prefs: Partial<Preferences> = {
        pluginConfigs: {},
      };

      expect(prefs.pluginConfigs).toEqual({});
    });

    it('should accept preferences with populated pluginConfigs', () => {
      const prefs: Partial<Preferences> = {
        pluginConfigs: {
          sketchybar: {
            mode: 'preset',
            preset: 'minimal',
            installedBy: 'mactheme',
          },
          aerospace: {
            mode: 'custom',
            installedBy: 'user',
          },
        },
      };

      expect(prefs.pluginConfigs?.sketchybar?.mode).toBe('preset');
      expect(prefs.pluginConfigs?.aerospace?.mode).toBe('custom');
    });
  });

  describe('PluginMode', () => {
    it('should only accept preset or custom', () => {
      const presetMode: PluginMode = 'preset';
      const customMode: PluginMode = 'custom';

      expect(presetMode).toBe('preset');
      expect(customMode).toBe('custom');
    });
  });
});
