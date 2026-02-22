/**
 * Adapter validation tests
 *
 * Ensures all adapters conform to the AppAdapter interface,
 * produce valid theme configs, and are properly registered.
 */

import { describe, it, expect } from 'vitest';
import { getAllAdapters, getAdapter, getAdaptersWithNotify, getAdaptersWithThemeConfig } from '../registry';
import { validateAdapter, mockThemeColors } from './testUtils';

// Ensure all adapters are registered
import '../adapters';

describe('Adapter Registry', () => {
  it('has all 4 adapters registered', () => {
    const adapters = getAllAdapters();
    expect(adapters).toHaveLength(4);
    expect(adapters.map((a) => a.name).sort()).toEqual([
      'aerospace',
      'neovim',
      'sketchybar',
      'wezterm',
    ]);
  });

  it('looks up adapters case-insensitively', () => {
    expect(getAdapter('WezTerm')).toBeDefined();
    expect(getAdapter('NEOVIM')).toBeDefined();
    expect(getAdapter('sketchybar')).toBeDefined();
    expect(getAdapter('AeroSpace')).toBeDefined();
  });

  it('returns undefined for unknown adapters', () => {
    expect(getAdapter('nonexistent')).toBeUndefined();
  });

  it('has 3 adapters with notify()', () => {
    const notifiers = getAdaptersWithNotify();
    expect(notifiers).toHaveLength(3);
    expect(notifiers.map((a) => a.name).sort()).toEqual([
      'aerospace',
      'sketchybar',
      'wezterm',
    ]);
  });

  it('has 4 adapters with generateThemeConfig()', () => {
    const generators = getAdaptersWithThemeConfig();
    expect(generators).toHaveLength(4);
  });
});

describe('Adapter Validation', () => {
  const adapters = getAllAdapters();

  for (const adapter of adapters) {
    describe(adapter.displayName, () => {
      it('passes structural validation', () => {
        const errors = validateAdapter(adapter);
        expect(errors).toEqual([]);
      });

      it('has a lowercase name', () => {
        expect(adapter.name).toBe(adapter.name.toLowerCase());
      });

      it('has at least one install path', () => {
        expect(adapter.installPaths.length).toBeGreaterThan(0);
      });

      it('has a non-empty configPath', () => {
        expect(adapter.configPath).toBeTruthy();
      });
    });
  }
});

describe('Theme Config Generation', () => {
  const adapters = getAdaptersWithThemeConfig();

  for (const adapter of adapters) {
    describe(adapter.displayName, () => {
      it('generates a valid theme config', () => {
        const output = adapter.generateThemeConfig!(mockThemeColors);

        expect(output).toBeDefined();
        expect(output.fileName).toBeTruthy();
        expect(typeof output.fileName).toBe('string');
        expect(output.content).toBeTruthy();
        expect(typeof output.content).toBe('string');
      });

      it('generates a non-empty file name with an extension', () => {
        const output = adapter.generateThemeConfig!(mockThemeColors);
        expect(output.fileName).toMatch(/\.\w+$/);
      });

      it('includes theme colors in output', () => {
        const output = adapter.generateThemeConfig!(mockThemeColors);
        // At minimum, the accent color should appear (all adapters use it)
        expect(output.content).toContain(mockThemeColors.accent.replace('#', ''));
      });
    });
  }
});

describe('Adapter Snippets', () => {
  it('wezterm has a snippet', () => {
    const adapter = getAdapter('wezterm')!;
    expect(adapter.snippet).toBeDefined();
    expect(adapter.snippet!.code).toContain('wezterm');
    expect(adapter.snippet!.instructions).toBeTruthy();
  });

  it('neovim has a snippet', () => {
    const adapter = getAdapter('neovim')!;
    expect(adapter.snippet).toBeDefined();
    expect(adapter.snippet!.code).toContain('dofile');
    expect(adapter.snippet!.instructions).toBeTruthy();
  });

  it('sketchybar has a snippet', () => {
    const adapter = getAdapter('sketchybar')!;
    expect(adapter.snippet).toBeDefined();
    expect(adapter.snippet!.code).toContain('source');
    expect(adapter.snippet!.instructions).toBeTruthy();
  });

  it('aerospace has a snippet', () => {
    const adapter = getAdapter('aerospace')!;
    expect(adapter.snippet).toBeDefined();
    expect(adapter.snippet!.code).toContain('aerospace-borders');
    expect(adapter.snippet!.instructions).toBeTruthy();
  });
});
