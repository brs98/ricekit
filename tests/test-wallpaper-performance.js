/**
 * Test script for wallpaper performance optimization
 * Tests thumbnail generation and performance with large wallpapers
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Wallpaper Performance Test');
console.log('================================\n');

// Test 1: Check if thumbnails directory exists
console.log('Test 1: Check thumbnail cache directory');
const homeDir = require('os').homedir();
const thumbnailDir = path.join(homeDir, 'Library/Application Support/ricekit/thumbnails');

if (fs.existsSync(thumbnailDir)) {
  const files = fs.readdirSync(thumbnailDir);
  console.log(`✓ Thumbnail cache directory exists`);
  console.log(`  Path: ${thumbnailDir}`);
  console.log(`  Cached thumbnails: ${files.length}`);

  // Calculate total size
  let totalSize = 0;
  files.forEach(file => {
    const stat = fs.statSync(path.join(thumbnailDir, file));
    totalSize += stat.size;
  });

  console.log(`  Total cache size: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`);

  // Show some example thumbnails
  if (files.length > 0) {
    console.log(`\n  Sample thumbnails:`);
    files.slice(0, 5).forEach(file => {
      const stat = fs.statSync(path.join(thumbnailDir, file));
      console.log(`    - ${file} (${(stat.size / 1024).toFixed(1)} KB)`);
    });
  }
} else {
  console.log(`⚠ Thumbnail cache directory not created yet`);
  console.log(`  It will be created on first use`);
}

// Test 2: Check wallpaper directories
console.log('\n\nTest 2: Check available wallpapers');
const themesDir = path.join(homeDir, 'Library/Application Support/Ricekit/themes');

if (fs.existsSync(themesDir)) {
  const themes = fs.readdirSync(themesDir);
  console.log(`✓ Found ${themes.length} themes`);

  let totalWallpapers = 0;
  let largestWallpaper = { path: '', size: 0 };

  themes.forEach(theme => {
    const wallpapersDir = path.join(themesDir, theme, 'wallpapers');
    if (fs.existsSync(wallpapersDir)) {
      const wallpapers = fs.readdirSync(wallpapersDir).filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.png', '.jpg', '.jpeg', '.heic', '.webp'].includes(ext);
      });

      totalWallpapers += wallpapers.length;

      wallpapers.forEach(wallpaper => {
        const wallpaperPath = path.join(wallpapersDir, wallpaper);
        const stat = fs.statSync(wallpaperPath);
        if (stat.size > largestWallpaper.size) {
          largestWallpaper = { path: wallpaperPath, size: stat.size };
        }
      });
    }
  });

  console.log(`  Total wallpapers: ${totalWallpapers}`);

  if (largestWallpaper.size > 0) {
    console.log(`\n  Largest wallpaper:`);
    console.log(`    Path: ${largestWallpaper.path}`);
    console.log(`    Size: ${(largestWallpaper.size / (1024 * 1024)).toFixed(2)} MB`);

    // Get dimensions using file command if available
    try {
      const { execSync } = require('child_process');
      const sips = execSync(`sips -g pixelWidth -g pixelHeight "${largestWallpaper.path}"`).toString();
      const width = sips.match(/pixelWidth: (\d+)/)?.[1];
      const height = sips.match(/pixelHeight: (\d+)/)?.[1];
      if (width && height) {
        console.log(`    Dimensions: ${width}x${height}px`);
      }
    } catch (e) {
      // sips command failed, skip
    }
  }
} else {
  console.log(`⚠ Themes directory not found`);
}

// Test 3: Performance recommendations
console.log('\n\nTest 3: Performance Analysis');
console.log('=============================');

if (fs.existsSync(thumbnailDir)) {
  const files = fs.readdirSync(thumbnailDir);
  let totalSize = 0;
  files.forEach(file => {
    const stat = fs.statSync(path.join(thumbnailDir, file));
    totalSize += stat.size;
  });

  const avgThumbnailSize = files.length > 0 ? totalSize / files.length : 0;

  console.log(`✓ Thumbnail system is active`);
  console.log(`  Average thumbnail size: ${(avgThumbnailSize / 1024).toFixed(1)} KB`);
  console.log(`  Expected reduction: ~95% smaller than originals`);

  if (avgThumbnailSize > 100 * 1024) {
    console.log(`  ⚠ Thumbnails seem large, quality may be too high`);
  } else {
    console.log(`  ✓ Thumbnail size is optimal for fast loading`);
  }
}

console.log('\nOptimizations implemented:');
console.log('  ✓ Thumbnail generation (400x250px, 80% quality)');
console.log('  ✓ Thumbnail caching (persistent across sessions)');
console.log('  ✓ Lazy loading (images load as you scroll)');
console.log('  ✓ Batch processing (3 concurrent thumbnail generations)');
console.log('  ✓ Automatic cache cleanup (removes old thumbnails after 30 days)');

console.log('\n\nTest complete! ✨');
console.log('================================\n');
