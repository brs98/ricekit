/**
 * Re-export from core module for backward compatibility.
 *
 * The canonical location is now src/core/utils/fs.ts
 * This file maintains existing imports but all code should
 * gradually migrate to importing from '@core/utils/fs' or
 * the relative path '../../core/utils/fs'.
 */

export {
  existsSync,
  readJson,
  writeJson,
  ensureDir,
  readDir,
  stat,
  isDirectory,
  isSymlink,
  readSymlink,
  createSymlink,
  unlink,
  rmdir,
  copyFile,
  copyDir,
  writeFile,
  readFile,
  fileExists,
  isExecutable,
  rename,
  appendFile,
  touch,
  getFileSize,
} from '../../core/utils/fs';
