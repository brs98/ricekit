// Test script to verify theme application
const fs = require('fs');
const path = require('path');

const currentDir = path.join(process.env.HOME, 'Library/Application Support/MacTheme/current');
const symlinkPath = path.join(currentDir, 'theme');
const themePath = path.join(process.env.HOME, 'Library/Application Support/MacTheme/themes/tokyo-night');

console.log('Testing theme application...');
console.log('Symlink path:', symlinkPath);
console.log('Theme path:', themePath);

// Check if theme exists
if (!fs.existsSync(themePath)) {
  console.error('Theme directory does not exist:', themePath);
  process.exit(1);
}

// Remove existing symlink if it exists
if (fs.existsSync(symlinkPath)) {
  const stats = fs.lstatSync(symlinkPath);
  if (stats.isSymbolicLink()) {
    fs.unlinkSync(symlinkPath);
    console.log('Removed existing symlink');
  }
}

// Create new symlink
try {
  fs.symlinkSync(themePath, symlinkPath, 'dir');
  console.log('✓ Created symlink successfully');

  // Verify symlink
  const linkStats = fs.lstatSync(symlinkPath);
  if (linkStats.isSymbolicLink()) {
    console.log('✓ Symlink verification passed');

    // Try to read through the symlink
    const themeJson = path.join(symlinkPath, 'theme.json');
    if (fs.existsSync(themeJson)) {
      console.log('✓ Can read files through symlink');
      const content = fs.readFileSync(themeJson, 'utf-8');
      const metadata = JSON.parse(content);
      console.log('✓ Theme:', metadata.name);
    }
  }

  console.log('\nAll checks passed!');
} catch (err) {
  console.error('Failed to create symlink:', err);
  process.exit(1);
}
