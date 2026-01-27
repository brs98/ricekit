/**
 * Async file system utilities for Flowstate
 *
 * These utilities wrap fs/promises with common patterns used throughout
 * the app, eliminating blocking file operations in IPC handlers.
 *
 * This module is pure Node.js with no Electron dependencies,
 * making it usable by both the Electron app and CLI.
 *
 * Note: existsSync is kept as-is since it's fast and often used
 * in conditional logic where async would be awkward.
 */

import fs from 'fs/promises';
import { existsSync, constants } from 'fs';
import path from 'path';

// Re-export existsSync for convenience (acceptable to keep sync)
export { existsSync };

/**
 * Read and parse a JSON file
 */
export async function readJson<T>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

/**
 * Write data as formatted JSON
 */
export async function writeJson(filePath: string, data: unknown): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Ensure a directory exists, creating it if necessary
 */
export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

/**
 * Read directory contents
 */
export async function readDir(dir: string): Promise<string[]> {
  return fs.readdir(dir);
}

/**
 * Get file/directory stats
 */
export async function stat(filePath: string): Promise<import('fs').Stats> {
  return fs.stat(filePath);
}

/**
 * Check if path is a directory
 */
export async function isDirectory(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Check if a file is a symlink
 */
export async function isSymlink(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.lstat(filePath);
    return stats.isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * Read symlink target
 */
export async function readSymlink(linkPath: string): Promise<string> {
  return fs.readlink(linkPath);
}

/**
 * Create a symlink
 */
export async function createSymlink(
  target: string,
  linkPath: string,
  type: 'file' | 'dir' = 'dir'
): Promise<void> {
  await fs.symlink(target, linkPath, type);
}

/**
 * Remove a file or symlink
 */
export async function unlink(filePath: string): Promise<void> {
  await fs.unlink(filePath);
}

/**
 * Remove a directory recursively
 */
export async function rmdir(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true });
}

/**
 * Copy a file
 */
export async function copyFile(src: string, dest: string): Promise<void> {
  await fs.copyFile(src, dest);
}

/**
 * Copy a directory recursively
 * Note: We implement this manually instead of using fs.cp() because
 * fs.cp() is NOT patched by Electron to work with ASAR archives.
 * This implementation uses only ASAR-compatible fs methods.
 */
export async function copyDir(src: string, dest: string): Promise<void> {
  // Create destination directory
  await fs.mkdir(dest, { recursive: true });

  // Read source directory contents
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      // Recursively copy subdirectories
      await copyDir(srcPath, destPath);
    } else {
      // Copy file by reading and writing (ASAR-compatible)
      const content = await fs.readFile(srcPath);
      await fs.writeFile(destPath, content);
    }
  }
}

/**
 * Write a text file
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * Read a text file
 */
export async function readFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf-8');
}

/**
 * Check if file exists and is accessible
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if file is executable
 */
export async function isExecutable(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Rename/move a file
 */
export async function rename(oldPath: string, newPath: string): Promise<void> {
  await fs.rename(oldPath, newPath);
}

/**
 * Append to a file
 */
export async function appendFile(filePath: string, content: string): Promise<void> {
  await fs.appendFile(filePath, content, 'utf-8');
}

/**
 * Get file size in bytes
 */
export async function getFileSize(filePath: string): Promise<number> {
  const stats = await fs.stat(filePath);
  return stats.size;
}
