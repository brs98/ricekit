const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

async function createTestTheme() {
  const themePath = path.join(
    process.env.HOME,
    'Library/Application Support/MacTheme/themes/tokyo-night'
  );

  const outputPath = '/tmp/tokyo-night-test.zip';

  // Remove old file if exists
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
  }

  const output = fs.createWriteStream(outputPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      console.log(`✅ Test theme created: ${outputPath}`);
      console.log(`   Size: ${archive.pointer()} bytes`);
      resolve(outputPath);
    });

    archive.on('error', reject);

    archive.pipe(output);
    archive.directory(themePath, 'tokyo-night');
    archive.finalize();
  });
}

createTestTheme().catch(console.error);
