import * as path from 'path';
import * as crypto from 'crypto';
import sharp from 'sharp';
import { app } from 'electron';
import { logger } from './logger';
import { existsSync, ensureDir, readDir, stat, unlink } from './utils/asyncFs';

const THUMBNAIL_WIDTH = 400;
const THUMBNAIL_HEIGHT = 250;
const THUMBNAIL_QUALITY = 80;

// Get cache directory for thumbnails
async function getThumbnailCacheDir(): Promise<string> {
  const cacheDir = path.join(app.getPath('userData'), 'thumbnails');
  if (!existsSync(cacheDir)) {
    await ensureDir(cacheDir);
  }
  return cacheDir;
}

// Generate a cache key from the file path and modification time
async function getCacheKey(filePath: string): Promise<string> {
  const stats = await stat(filePath);
  const mtime = stats.mtime.getTime();
  const hash = crypto.createHash('md5').update(`${filePath}-${mtime}`).digest('hex');
  return hash;
}

// Get thumbnail path from cache
async function getThumbnailPath(cacheKey: string): Promise<string> {
  const cacheDir = await getThumbnailCacheDir();
  return path.join(cacheDir, `${cacheKey}.jpg`);
}

/**
 * Generate a thumbnail for an image file
 * Returns the path to the thumbnail (either cached or newly generated)
 */
export async function generateThumbnail(imagePath: string): Promise<string> {
  try {
    // Check if file exists
    if (!existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    // Get cache key
    const cacheKey = await getCacheKey(imagePath);
    const thumbnailPath = await getThumbnailPath(cacheKey);

    // Check if thumbnail already exists in cache
    if (existsSync(thumbnailPath)) {
      logger.info(`[Thumbnail] Using cached thumbnail for: ${path.basename(imagePath)}`);
      return thumbnailPath;
    }

    // Generate new thumbnail
    logger.info(`[Thumbnail] Generating thumbnail for: ${path.basename(imagePath)}`);

    await sharp(imagePath)
      .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: THUMBNAIL_QUALITY })
      .toFile(thumbnailPath);

    logger.info(`[Thumbnail] Generated thumbnail: ${path.basename(thumbnailPath)}`);
    return thumbnailPath;
  } catch (error) {
    logger.error(`[Thumbnail] Error generating thumbnail for ${imagePath}:`, error);
    // Return original path as fallback
    return imagePath;
  }
}

/**
 * Generate thumbnails for multiple images
 * Returns a map of original path to thumbnail path
 */
export async function generateThumbnails(imagePaths: string[]): Promise<Map<string, string>> {
  const thumbnailMap = new Map<string, string>();

  // Process thumbnails in parallel (but limit concurrency to avoid overwhelming the system)
  const batchSize = 3;
  for (let i = 0; i < imagePaths.length; i += batchSize) {
    const batch = imagePaths.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (imagePath) => {
        const thumbnailPath = await generateThumbnail(imagePath);
        return { imagePath, thumbnailPath };
      })
    );

    results.forEach(({ imagePath, thumbnailPath }) => {
      thumbnailMap.set(imagePath, thumbnailPath);
    });
  }

  return thumbnailMap;
}

/**
 * Clear old thumbnails from cache
 * Removes thumbnails that haven't been accessed in the last 30 days
 */
export async function clearOldThumbnails(): Promise<void> {
  try {
    const cacheDir = await getThumbnailCacheDir();
    const files = await readDir(cacheDir);
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    let deletedCount = 0;
    for (const file of files) {
      const filePath = path.join(cacheDir, file);
      const stats = await stat(filePath);

      if (stats.atimeMs < thirtyDaysAgo) {
        await unlink(filePath);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      logger.info(`[Thumbnail] Cleared ${deletedCount} old thumbnails from cache`);
    }
  } catch (error) {
    logger.error('[Thumbnail] Error clearing old thumbnails:', error);
  }
}

/**
 * Clear all thumbnails from cache
 */
export async function clearAllThumbnails(): Promise<void> {
  try {
    const cacheDir = await getThumbnailCacheDir();
    const files = await readDir(cacheDir);

    await Promise.all(files.map((file) => unlink(path.join(cacheDir, file))));

    logger.info(`[Thumbnail] Cleared ${files.length} thumbnails from cache`);
  } catch (error) {
    logger.error('[Thumbnail] Error clearing thumbnails:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getThumbnailCacheStats(): Promise<{ count: number; sizeBytes: number }> {
  try {
    const cacheDir = await getThumbnailCacheDir();
    const files = await readDir(cacheDir);

    let totalSize = 0;
    for (const file of files) {
      const stats = await stat(path.join(cacheDir, file));
      totalSize += stats.size;
    }

    return {
      count: files.length,
      sizeBytes: totalSize,
    };
  } catch (error) {
    logger.error('[Thumbnail] Error getting cache stats:', error);
    return { count: 0, sizeBytes: 0 };
  }
}
