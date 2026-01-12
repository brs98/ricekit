import path from 'path';
import { getPresetsDir, getCurrentPresetsDir } from './directories';
import { logger } from './logger';
import type { PresetInfo } from '../shared/types';
import {
  ensureDir,
  readDir,
  isDirectory,
  existsSync,
  copyDir,
  readJson,
  createSymlink,
  unlink,
  readSymlink,
  isSymlink,
} from './utils/asyncFs';

const SUPPORTED_PLUGINS = [
  'sketchybar',
  'aerospace',
  'starship',
  'tmux',
  'bat',
  'delta',
] as const;
export type SupportedPlugin = (typeof SUPPORTED_PLUGINS)[number];

/**
 * Install bundled presets to the presets directory
 */
export async function installBundledPresets(): Promise<void> {
  const presetsDir = getPresetsDir();
  const bundledPresetsDir = path.join(__dirname, '../../bundled-presets');

  logger.info('Installing bundled presets...');
  logger.info('Bundled presets dir:', bundledPresetsDir);
  logger.info('Target presets dir:', presetsDir);

  // Check if bundled presets directory exists
  if (!existsSync(bundledPresetsDir)) {
    logger.info('No bundled presets directory found, skipping preset installation');
    return;
  }

  // Ensure the presets directory exists
  await ensureDir(presetsDir);

  // Copy all bundled presets to presets directory
  for (const pluginName of SUPPORTED_PLUGINS) {
    const srcPluginDir = path.join(bundledPresetsDir, pluginName);
    const destPluginDir = path.join(presetsDir, pluginName);

    if (!existsSync(srcPluginDir)) {
      logger.info(`No bundled presets for ${pluginName}, skipping`);
      continue;
    }

    await ensureDir(destPluginDir);

    const presetNames = await readDir(srcPluginDir);
    for (const presetName of presetNames) {
      const srcPresetDir = path.join(srcPluginDir, presetName);
      const destPresetDir = path.join(destPluginDir, presetName);

      // Skip if not a directory
      if (!(await isDirectory(srcPresetDir))) {
        continue;
      }

      // Only install if preset doesn't already exist
      if (!existsSync(destPresetDir)) {
        await copyDir(srcPresetDir, destPresetDir);
        logger.info(`Installed preset: ${pluginName}/${presetName}`);
      } else {
        logger.info(`Preset already exists: ${pluginName}/${presetName}`);
      }
    }
  }

  logger.info('Bundled presets installation complete!');
}

/**
 * List available presets for a plugin
 */
export async function listPresets(pluginName: string): Promise<PresetInfo[]> {
  const pluginPresetsDir = path.join(getPresetsDir(), pluginName);

  if (!existsSync(pluginPresetsDir)) {
    return [];
  }

  const presetDirs = await readDir(pluginPresetsDir);
  const presets: PresetInfo[] = [];

  for (const dir of presetDirs) {
    const presetPath = path.join(pluginPresetsDir, dir);
    const metadataPath = path.join(presetPath, 'preset.json');

    if (!(await isDirectory(presetPath))) {
      continue;
    }

    if (existsSync(metadataPath)) {
      try {
        const metadata = await readJson<PresetInfo>(metadataPath);
        presets.push(metadata);
      } catch (err) {
        logger.error(`Failed to read preset metadata for ${pluginName}/${dir}:`, err);
        // Use fallback metadata
        presets.push({
          name: dir,
          displayName: dir.charAt(0).toUpperCase() + dir.slice(1),
          description: `${dir} preset for ${pluginName}`,
          features: [],
        });
      }
    } else {
      // Fallback metadata if preset.json doesn't exist
      presets.push({
        name: dir,
        displayName: dir.charAt(0).toUpperCase() + dir.slice(1),
        description: `${dir} preset for ${pluginName}`,
        features: [],
      });
    }
  }

  return presets;
}

/**
 * Set active preset for a plugin (update symlink)
 */
export async function setActivePreset(pluginName: string, presetName: string): Promise<void> {
  const currentPresetsDir = getCurrentPresetsDir();
  const symlinkPath = path.join(currentPresetsDir, pluginName);
  const targetPath = path.join(getPresetsDir(), pluginName, presetName);

  // Verify target exists
  if (!existsSync(targetPath)) {
    throw new Error(`Preset not found: ${pluginName}/${presetName}`);
  }

  // Ensure current presets directory exists
  await ensureDir(currentPresetsDir);

  // Remove existing symlink if present
  if (existsSync(symlinkPath)) {
    await unlink(symlinkPath);
  }

  // Create new symlink
  await createSymlink(targetPath, symlinkPath, 'dir');

  logger.info(`Set active preset: ${pluginName}/${presetName}`);
}

/**
 * Get current active preset for a plugin
 */
export async function getActivePreset(pluginName: string): Promise<string | null> {
  const symlinkPath = path.join(getCurrentPresetsDir(), pluginName);

  if (!existsSync(symlinkPath)) {
    return null;
  }

  try {
    if (!(await isSymlink(symlinkPath))) {
      return null;
    }

    const target = await readSymlink(symlinkPath);
    return path.basename(target);
  } catch (err) {
    logger.error(`Failed to read preset symlink for ${pluginName}:`, err);
    return null;
  }
}

/**
 * Check if a plugin is supported
 */
export function isSupportedPlugin(pluginName: string): pluginName is SupportedPlugin {
  return SUPPORTED_PLUGINS.includes(pluginName as SupportedPlugin);
}

/**
 * Get all supported plugin names
 */
export function getSupportedPlugins(): readonly string[] {
  return SUPPORTED_PLUGINS;
}
