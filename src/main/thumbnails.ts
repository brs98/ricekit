import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import sharp from 'sharp';
import { app } from 'electron';

const THUMBNAIL_WIDTH = 400;
const THUMBNAIL_HEIGHT = 250;
const THUMBNAIL_QUALITY = 80;

// Get cache directory for thumbnails
function getThumbnailCacheDir(): string {
  const cacheDir = path.join(app.getPath('userData'), 'thumbnails');
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  return cacheDir;
}

// Generate a cache key from the file path and modification time
function getCacheKey(filePath: string): string {
  const stats = fs.statSync(filePath);
  const mtime = stats.mtime.getTime();
  const hash = crypto.createHash('md5').update(`${filePath}-${mtime}`).digest('hex');
  return hash;
}

// Get thumbnail path from cache
function getThumbnailPath(cacheKey: string): string {
  const cacheDir = getThumbnailCacheDir();
  return path.join(cacheDir, `${cacheKey}.jpg`);
}

/**
 * Generate a thumbnail for an image file
 * Returns the path to the thumbnail (either cached or newly generated)
 */
export async function generateThumbnail(imagePath: string): Promise<string> {
  try {
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    // Get cache key
    const cacheKey = getCacheKey(imagePath);
    const thumbnailPath = getThumbnailPath(cacheKey);

    // Check if thumbnail already exists in cache
    if (fs.existsSync(thumbnailPath)) {
      console.log(`[Thumbnail] Using cached thumbnail for: ${path.basename(imagePath)}`);
      return thumbnailPath;
    }

    // Generate new thumbnail
    console.log(`[Thumbnail] Generating thumbnail for: ${path.basename(imagePath)}`);

    await sharp(imagePath)
      .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: THUMBNAIL_QUALITY })
      .toFile(thumbnailPath);

    console.log(`[Thumbnail] Generated thumbnail: ${path.basename(thumbnailPath)}`);
    return thumbnailPath;
  } catch (error) {
    console.error(`[Thumbnail] Error generating thumbnail for ${imagePath}:`, error);
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
export function clearOldThumbnails(): void {
  try {
    const cacheDir = getThumbnailCacheDir();
    const files = fs.readdirSync(cacheDir);
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    let deletedCount = 0;
    files.forEach((file) => {
      const filePath = path.join(cacheDir, file);
      const stats = fs.statSync(filePath);

      if (stats.atimeMs < thirtyDaysAgo) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    });

    if (deletedCount > 0) {
      console.log(`[Thumbnail] Cleared ${deletedCount} old thumbnails from cache`);
    }
  } catch (error) {
    console.error('[Thumbnail] Error clearing old thumbnails:', error);
  }
}

/**
 * Clear all thumbnails from cache
 */
export function clearAllThumbnails(): void {
  try {
    const cacheDir = getThumbnailCacheDir();
    const files = fs.readdirSync(cacheDir);

    files.forEach((file) => {
      fs.unlinkSync(path.join(cacheDir, file));
    });

    console.log(`[Thumbnail] Cleared ${files.length} thumbnails from cache`);
  } catch (error) {
    console.error('[Thumbnail] Error clearing thumbnails:', error);
  }
}

/**
 * Get cache statistics
 */
export function getThumbnailCacheStats(): { count: number; sizeBytes: number } {
  try {
    const cacheDir = getThumbnailCacheDir();
    const files = fs.readdirSync(cacheDir);

    let totalSize = 0;
    files.forEach((file) => {
      const stats = fs.statSync(path.join(cacheDir, file));
      totalSize += stats.size;
    });

    return {
      count: files.length,
      sizeBytes: totalSize,
    };
  } catch (error) {
    console.error('[Thumbnail] Error getting cache stats:', error);
    return { count: 0, sizeBytes: 0 };
  }
}
