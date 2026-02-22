/**
 * Central adapter registry
 *
 * Module-scoped Map. Adapters self-register on import via adapters/index.ts.
 */

import type { AppAdapter } from './adapter';
import { existsSync } from '../utils/fs';

const adapters = new Map<string, AppAdapter>();

export function registerAdapter(adapter: AppAdapter): void {
  if (adapters.has(adapter.name)) {
    throw new Error(`Adapter already registered: ${adapter.name}`);
  }
  adapters.set(adapter.name, adapter);
}

export function getAdapter(name: string): AppAdapter | undefined {
  return adapters.get(name.toLowerCase());
}

export function getAllAdapters(): AppAdapter[] {
  return Array.from(adapters.values());
}

export function getAdaptersWithNotify(): AppAdapter[] {
  return getAllAdapters().filter((a) => typeof a.notify === 'function');
}

export function getAdaptersWithThemeConfig(): AppAdapter[] {
  return getAllAdapters().filter((a) => typeof a.generateThemeConfig === 'function');
}

/**
 * Resolve the effective config path for an adapter.
 * For adapters with configPaths, returns the first existing path or the first entry as default.
 */
export function resolveConfigPath(adapter: AppAdapter): string {
  if (adapter.configPaths) {
    return adapter.configPaths.find((p) => existsSync(p)) ?? adapter.configPaths[0] ?? adapter.configPath;
  }
  return adapter.configPath;
}
