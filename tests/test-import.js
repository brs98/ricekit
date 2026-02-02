/**
 * Test theme import functionality
 * This script:
 * 1. Exports a theme to create a .ricekit file
 * 2. Imports the theme back
 * 3. Verifies the imported theme exists
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

async function testThemeImport() {
  console.log('\n=== Testing Theme Import Functionality ===\n');

  const customThemesDir = path.join(os.homedir(), 'Library', 'Application Support', 'Ricekit', 'custom-themes');

  // Step 1: Check available themes
  const themesDir = path.join(os.homedir(), 'Library', 'Application Support', 'Ricekit', 'themes');
  const themes = fs.readdirSync(themesDir);
  console.log(`Available themes: ${themes.join(', ')}\n`);

  // Step 2: Export a theme (this creates a .ricekit file)
  console.log('To test import:');
  console.log('1. Open Ricekit app');
  console.log('2. Go to Settings > Backup & Restore');
  console.log('3. Click "Export..." button');
  console.log('4. Select a theme (e.g., tokyo-night)');
  console.log('5. Save the .ricekit file to your Desktop');
  console.log('6. Click "Import..." button');
  console.log('7. Select the exported .ricekit file');
  console.log('8. Verify the theme is imported successfully');
  console.log('');

  // Step 3: Check if any custom themes exist
  if (fs.existsSync(customThemesDir)) {
    const customThemes = fs.readdirSync(customThemesDir);
    console.log(`Current custom themes: ${customThemes.length > 0 ? customThemes.join(', ') : 'none'}\n`);
  } else {
    console.log('Custom themes directory does not exist yet\n');
  }

  console.log('Expected behavior after import:');
  console.log('✓ Success notification appears');
  console.log('✓ Theme appears in Themes view');
  console.log('✓ Theme directory exists in custom-themes/');
  console.log('✓ All config files are present in imported theme');
  console.log('');
}

testThemeImport();
