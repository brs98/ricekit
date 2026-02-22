/**
 * AppAdapter interface for extensible app integration
 *
 * Each supported app implements this interface in a single file,
 * consolidating detection, setup, notification, and theme config generation.
 */

import type { ThemeColors } from '../../shared/types';

export type AppCategory = 'terminal' | 'editor' | 'system' | 'tiling';

export interface ThemeConfigOutput {
  fileName: string;
  content: string;
}

export interface AppAdapter {
  // === Required: Identity ===
  readonly name: string;
  readonly displayName: string;
  readonly category: AppCategory;

  // === Required: Detection ===
  readonly installPaths: string[];
  readonly configPath: string;
  readonly configPaths?: readonly string[];

  // === Optional: Setup ===
  readonly templateFile?: string;
  readonly snippet?: {
    code: string;
    instructions: string;
  };

  // === Optional: Overrides ===
  checkIntegration?(configPath: string): Promise<boolean>;

  // === Optional: Notification ===
  notify?(themePath: string, onLog?: (msg: string) => void): Promise<boolean>;

  // === Optional: Theme Config Generation ===
  generateThemeConfig?(colors: ThemeColors): ThemeConfigOutput;
}
