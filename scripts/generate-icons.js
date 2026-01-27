#!/usr/bin/env node
/**
 * Generate app icons for Flowstate
 * Creates icon.icns (macOS) and icon.ico (Windows) from a generated SVG
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BUILD_DIR = path.join(__dirname, '..', 'build');
const ICONSET_DIR = path.join(BUILD_DIR, 'icon.iconset');

// Icon sizes needed for macOS iconset
const ICON_SIZES = [16, 32, 64, 128, 256, 512, 1024];

// Modern gradient theme icon SVG
const ICON_SVG = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Main gradient - purple to blue to teal -->
    <linearGradient id="mainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#8B5CF6"/>
      <stop offset="50%" style="stop-color:#3B82F6"/>
      <stop offset="100%" style="stop-color:#06B6D4"/>
    </linearGradient>

    <!-- Subtle inner shadow -->
    <linearGradient id="innerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:rgba(255,255,255,0.2)"/>
      <stop offset="100%" style="stop-color:rgba(0,0,0,0.1)"/>
    </linearGradient>

    <!-- Glow effect -->
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="20" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background rounded square (macOS style) -->
  <rect x="40" y="40" width="944" height="944" rx="180" ry="180" fill="url(#mainGrad)"/>

  <!-- Inner highlight -->
  <rect x="60" y="60" width="904" height="904" rx="170" ry="170" fill="url(#innerGrad)" opacity="0.5"/>

  <!-- Theme palette icon - 4 color swatches -->
  <g transform="translate(512, 512)">
    <!-- Top-left swatch -->
    <rect x="-220" y="-220" width="180" height="180" rx="30" fill="#F472B6" opacity="0.95"/>

    <!-- Top-right swatch -->
    <rect x="40" y="-220" width="180" height="180" rx="30" fill="#A78BFA" opacity="0.95"/>

    <!-- Bottom-left swatch -->
    <rect x="-220" y="40" width="180" height="180" rx="30" fill="#34D399" opacity="0.95"/>

    <!-- Bottom-right swatch -->
    <rect x="40" y="40" width="180" height="180" rx="30" fill="#FBBF24" opacity="0.95"/>

    <!-- Center connecting element - small diamond -->
    <rect x="-35" y="-35" width="70" height="70" rx="12" fill="white" opacity="0.9" transform="rotate(45)"/>
  </g>
</svg>
`;

async function generateIcons() {
  console.log('Generating Flowstate icons...\n');

  // Ensure directories exist
  if (!fs.existsSync(BUILD_DIR)) {
    fs.mkdirSync(BUILD_DIR, { recursive: true });
  }
  if (!fs.existsSync(ICONSET_DIR)) {
    fs.mkdirSync(ICONSET_DIR, { recursive: true });
  }

  // Generate base PNG from SVG
  const svgBuffer = Buffer.from(ICON_SVG);

  console.log('Creating PNG icons...');

  // Generate all sizes for macOS iconset
  for (const size of ICON_SIZES) {
    const filename1x = `icon_${size}x${size}.png`;
    const filename2x = `icon_${size}x${size}@2x.png`;

    // 1x version
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(ICONSET_DIR, filename1x));
    console.log(`  Created ${filename1x}`);

    // 2x version (for Retina displays) - only up to 512
    if (size <= 512) {
      await sharp(svgBuffer)
        .resize(size * 2, size * 2)
        .png()
        .toFile(path.join(ICONSET_DIR, filename2x));
      console.log(`  Created ${filename2x}`);
    }
  }

  // Generate macOS .icns using iconutil
  console.log('\nCreating macOS icon.icns...');
  try {
    execSync(`iconutil -c icns "${ICONSET_DIR}" -o "${path.join(BUILD_DIR, 'icon.icns')}"`, {
      stdio: 'inherit'
    });
    console.log('  Created icon.icns');
  } catch (error) {
    console.error('  Failed to create .icns (iconutil not available or failed)');
    console.error('  This is only needed for macOS builds');
  }

  // Generate Windows .ico (multi-resolution)
  console.log('\nCreating Windows icon.ico...');

  // For ICO, we need specific sizes: 16, 32, 48, 256
  const icoSizes = [16, 32, 48, 256];
  const icoBuffers = await Promise.all(
    icoSizes.map(size =>
      sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toBuffer()
    )
  );

  // Create ICO file manually (ICO format)
  const icoBuffer = createIco(icoBuffers, icoSizes);
  fs.writeFileSync(path.join(BUILD_DIR, 'icon.ico'), icoBuffer);
  console.log('  Created icon.ico');

  // Also save the base 1024x1024 PNG for other uses
  await sharp(svgBuffer)
    .resize(1024, 1024)
    .png()
    .toFile(path.join(BUILD_DIR, 'icon.png'));
  console.log('  Created icon.png (1024x1024)');

  // Cleanup iconset directory
  fs.rmSync(ICONSET_DIR, { recursive: true, force: true });

  console.log('\nDone! Icons created in build/');
}

/**
 * Create ICO file from PNG buffers
 * ICO format: https://en.wikipedia.org/wiki/ICO_(file_format)
 */
function createIco(pngBuffers, sizes) {
  const numImages = pngBuffers.length;

  // ICO header: 6 bytes
  // Image directory: 16 bytes per image
  // Image data: PNG buffers

  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = dirEntrySize * numImages;

  let dataOffset = headerSize + dirSize;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);        // Reserved
  header.writeUInt16LE(1, 2);        // Type: 1 = ICO
  header.writeUInt16LE(numImages, 4); // Number of images

  const dirEntries = [];
  const imageDataBuffers = [];

  for (let i = 0; i < numImages; i++) {
    const size = sizes[i];
    const pngBuffer = pngBuffers[i];

    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(size === 256 ? 0 : size, 0);  // Width (0 = 256)
    entry.writeUInt8(size === 256 ? 0 : size, 1);  // Height (0 = 256)
    entry.writeUInt8(0, 2);                         // Color palette
    entry.writeUInt8(0, 3);                         // Reserved
    entry.writeUInt16LE(1, 4);                      // Color planes
    entry.writeUInt16LE(32, 6);                     // Bits per pixel
    entry.writeUInt32LE(pngBuffer.length, 8);       // Size of image data
    entry.writeUInt32LE(dataOffset, 12);            // Offset to image data

    dirEntries.push(entry);
    imageDataBuffers.push(pngBuffer);
    dataOffset += pngBuffer.length;
  }

  return Buffer.concat([header, ...dirEntries, ...imageDataBuffers]);
}

generateIcons().catch(console.error);
