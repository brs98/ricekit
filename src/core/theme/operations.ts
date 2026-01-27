/**
 * Theme CRUD operations
 *
 * Create, delete, duplicate, export, import operations for themes.
 */

import path from 'path';
import os from 'os';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import archiver from 'archiver';
import type { ThemeMetadata, State } from '../../shared/types';
import {
  existsSync,
  readJson,
  writeJson,
  ensureDir,
  rmdir,
  copyDir,
  copyFile,
  stat,
  readDir,
  unlink,
} from '../utils/fs';
import { getPathProvider } from '../paths';
import type { Result } from '../interfaces';
import { ok, err } from '../interfaces';

const execAsync = promisify(exec);

/**
 * Delete a custom theme
 */
export async function deleteTheme(name: string): Promise<Result<void, Error>> {
  const paths = getPathProvider();
  const customThemesDir = paths.getCustomThemesDir();
  const themeDir = path.join(customThemesDir, name);

  // Check if theme exists in custom themes directory
  if (!existsSync(themeDir)) {
    // Check if it's a bundled theme
    const bundledDir = path.join(paths.getThemesDir(), name);
    if (existsSync(bundledDir)) {
      return err(new Error('Cannot delete bundled themes. Only custom themes can be deleted.'));
    }
    return err(new Error(`Theme "${name}" not found`));
  }

  // Check if this is the currently active theme
  const statePath = paths.getStatePath();
  if (existsSync(statePath)) {
    const state = await readJson<State>(statePath);
    if (state.currentTheme === name) {
      return err(new Error('Cannot delete the currently active theme. Switch to a different theme first.'));
    }
  }

  // Delete the theme directory
  await rmdir(themeDir);

  return ok(undefined);
}

/**
 * Duplicate a theme
 */
export async function duplicateTheme(
  sourceName: string,
  newName?: string
): Promise<Result<{ name: string; path: string }, Error>> {
  const paths = getPathProvider();
  const themesDir = paths.getThemesDir();
  const customThemesDir = paths.getCustomThemesDir();

  // Find the source theme
  let sourceThemeDir: string;
  if (existsSync(path.join(themesDir, sourceName))) {
    sourceThemeDir = path.join(themesDir, sourceName);
  } else if (existsSync(path.join(customThemesDir, sourceName))) {
    sourceThemeDir = path.join(customThemesDir, sourceName);
  } else {
    return err(new Error(`Theme "${sourceName}" not found`));
  }

  // Read source theme metadata
  const sourceMetadataPath = path.join(sourceThemeDir, 'theme.json');
  const sourceMetadata = await readJson<ThemeMetadata>(sourceMetadataPath);

  // Generate new theme name and directory
  let newThemeName: string;
  let newThemeDirName: string;
  let newThemeDir: string;

  if (newName) {
    newThemeName = newName;
    newThemeDirName = newName.toLowerCase().replace(/\s+/g, '-');
    newThemeDir = path.join(customThemesDir, newThemeDirName);

    if (existsSync(newThemeDir)) {
      return err(new Error(`Theme "${newName}" already exists`));
    }
  } else {
    // Auto-generate name
    let copyNumber = 1;
    newThemeName = `${sourceMetadata.name} (Copy)`;
    newThemeDirName = `${sourceName}-copy`;
    newThemeDir = path.join(customThemesDir, newThemeDirName);

    while (existsSync(newThemeDir)) {
      copyNumber++;
      newThemeName = `${sourceMetadata.name} (Copy ${copyNumber})`;
      newThemeDirName = `${sourceName}-copy-${copyNumber}`;
      newThemeDir = path.join(customThemesDir, newThemeDirName);
    }
  }

  // Ensure custom themes directory exists
  await ensureDir(customThemesDir);

  // Copy all files from source to destination
  const files = await readDir(sourceThemeDir);
  await ensureDir(newThemeDir);

  for (const file of files) {
    const sourcePath = path.join(sourceThemeDir, file);
    const destPath = path.join(newThemeDir, file);

    const fileStat = await stat(sourcePath);
    if (fileStat.isDirectory()) {
      await copyDir(sourcePath, destPath);
    } else {
      await copyFile(sourcePath, destPath);
    }
  }

  // Update metadata in the copy
  const newMetadata: ThemeMetadata = {
    ...sourceMetadata,
    name: newThemeName,
    author: sourceMetadata.author ? `${sourceMetadata.author} (duplicated)` : 'Unknown',
  };
  await writeJson(path.join(newThemeDir, 'theme.json'), newMetadata);

  return ok({ name: newThemeDirName, path: newThemeDir });
}

/**
 * Export a theme to a zip file
 */
export async function exportTheme(
  name: string,
  outputPath?: string
): Promise<Result<string, Error>> {
  const paths = getPathProvider();
  const themesDir = paths.getThemesDir();
  const customThemesDir = paths.getCustomThemesDir();

  // Find the theme directory
  let themePath = path.join(themesDir, name);
  if (!existsSync(themePath)) {
    themePath = path.join(customThemesDir, name);
    if (!existsSync(themePath)) {
      return err(new Error(`Theme "${name}" not found`));
    }
  }

  // Default output path
  const exportPath = outputPath || path.join(os.homedir(), 'Downloads', `${name}.flowstate`);

  // Ensure output directory exists
  await ensureDir(path.dirname(exportPath));

  // Create zip archive
  return new Promise((resolve) => {
    const output = fs.createWriteStream(exportPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      resolve(ok(exportPath));
    });

    archive.on('error', (error) => {
      resolve(err(new Error(`Export failed: ${error.message}`)));
    });

    archive.pipe(output);
    archive.directory(themePath, name);
    archive.finalize();
  });
}

/**
 * Import a theme from a zip file
 */
export async function importTheme(
  importPath: string
): Promise<Result<{ name: string; path: string }, Error>> {
  const paths = getPathProvider();
  const customThemesDir = paths.getCustomThemesDir();

  // Validate file exists
  if (!existsSync(importPath)) {
    return err(new Error(`File not found: ${importPath}`));
  }

  // Create temporary directory for extraction
  const tmpDir = path.join(os.tmpdir(), `flowstate-import-${Date.now()}`);
  await ensureDir(tmpDir);

  try {
    // Extract the zip file using unzip command
    await execAsync(`unzip -q "${importPath}" -d "${tmpDir}"`);

    // Find the theme directory (should be a single directory inside)
    const extractedItems = await readDir(tmpDir);
    const directories = [];
    for (const item of extractedItems) {
      if (item.startsWith('.')) continue; // Skip hidden files
      const itemPath = path.join(tmpDir, item);
      const itemStat = await stat(itemPath);
      if (itemStat.isDirectory()) {
        directories.push(item);
      }
    }

    if (directories.length === 0) {
      await rmdir(tmpDir);
      return err(new Error('Invalid theme archive: no theme directory found'));
    }

    // Use the first directory as the theme
    const themeName = directories[0];
    const extractedThemeDir = path.join(tmpDir, themeName);

    // Validate theme.json exists
    const themeJsonPath = path.join(extractedThemeDir, 'theme.json');
    if (!existsSync(themeJsonPath)) {
      await rmdir(tmpDir);
      return err(new Error('Invalid theme: missing theme.json'));
    }

    // Determine destination path
    let destThemeName = themeName;
    let destThemeDir = path.join(customThemesDir, destThemeName);

    // Handle name conflicts
    let counter = 1;
    while (existsSync(destThemeDir)) {
      destThemeName = `${themeName}-${counter}`;
      destThemeDir = path.join(customThemesDir, destThemeName);
      counter++;
    }

    // Ensure custom themes directory exists
    await ensureDir(customThemesDir);

    // Copy theme to custom themes directory
    await copyDir(extractedThemeDir, destThemeDir);

    // Clean up temp directory
    await rmdir(tmpDir);

    return ok({ name: destThemeName, path: destThemeDir });
  } catch (error) {
    // Clean up temp directory on error
    if (existsSync(tmpDir)) {
      await rmdir(tmpDir);
    }
    return err(new Error(`Import failed: ${error instanceof Error ? error.message : String(error)}`));
  }
}

/**
 * Import a theme from a URL
 */
export async function importThemeFromUrl(
  url: string
): Promise<Result<{ name: string; path: string }, Error>> {
  // Validate URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return err(new Error('Invalid URL format'));
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return err(new Error('Only HTTP and HTTPS URLs are supported'));
  }

  // Create temporary directory for download
  const tmpDir = path.join(os.tmpdir(), `flowstate-url-import-${Date.now()}`);
  await ensureDir(tmpDir);

  try {
    // Determine filename from URL or use default
    const urlPath = parsedUrl.pathname;
    let filename = path.basename(urlPath) || 'theme.flowstate';
    if (!filename.endsWith('.flowstate') && !filename.endsWith('.zip')) {
      filename += '.flowstate';
    }
    const downloadPath = path.join(tmpDir, filename);

    // Download using curl (available on macOS)
    await execAsync(`curl -fsSL -o "${downloadPath}" "${url}"`);

    // Verify file was downloaded
    const downloadStats = await stat(downloadPath);
    if (downloadStats.size === 0) {
      await rmdir(tmpDir);
      return err(new Error('Downloaded file is empty'));
    }

    // Import the downloaded file
    const result = await importTheme(downloadPath);

    // Clean up temp directory
    await rmdir(tmpDir);

    return result;
  } catch (error) {
    if (existsSync(tmpDir)) {
      await rmdir(tmpDir);
    }
    return err(new Error(`Download failed: ${error instanceof Error ? error.message : String(error)}`));
  }
}

/**
 * Create a new custom theme
 */
export async function createTheme(
  name: string,
  options: {
    author?: string;
    description?: string;
    baseTheme?: string;
    colors?: Partial<ThemeMetadata['colors']>;
  } = {}
): Promise<Result<{ name: string; path: string }, Error>> {
  const paths = getPathProvider();
  const customThemesDir = paths.getCustomThemesDir();

  // Generate directory name
  const dirName = name.toLowerCase().replace(/\s+/g, '-');
  const themeDir = path.join(customThemesDir, dirName);

  // Check if theme already exists
  if (existsSync(themeDir)) {
    return err(new Error(`Theme "${name}" already exists`));
  }

  // If base theme specified, duplicate it
  if (options.baseTheme) {
    const dupResult = await duplicateTheme(options.baseTheme, name);
    if (!dupResult.success) {
      return dupResult;
    }

    // Update metadata with provided options
    const themeJsonPath = path.join(dupResult.data.path, 'theme.json');
    const metadata = await readJson<ThemeMetadata>(themeJsonPath);

    if (options.author) metadata.author = options.author;
    if (options.description) metadata.description = options.description;

    await writeJson(themeJsonPath, metadata);
    return ok({ name: dirName, path: dupResult.data.path });
  }

  // Create new theme from scratch with default colors
  await ensureDir(themeDir);

  const defaultColors: ThemeMetadata['colors'] = {
    background: '#1a1b26',
    foreground: '#c0caf5',
    cursor: '#c0caf5',
    selection: '#33467c',
    accent: '#7aa2f7',
    border: '#7aa2f7',
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
    ...options.colors,
  };

  const metadata: ThemeMetadata = {
    name,
    author: options.author || 'Unknown',
    version: '1.0.0',
    description: options.description || 'A custom theme',
    colors: defaultColors,
  };

  await writeJson(path.join(themeDir, 'theme.json'), metadata);

  // Create empty wallpapers directory
  await ensureDir(path.join(themeDir, 'wallpapers'));

  return ok({ name: dirName, path: themeDir });
}
