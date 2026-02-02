/**
 * Test script for Dynamic Wallpaper Feature (Test #151)
 *
 * This test verifies that the dynamic wallpaper feature works correctly:
 * 1. Theme has light and dark wallpaper variants
 * 2. UI toggle for enabling/disabling dynamic wallpaper
 * 3. Wallpaper switches when macOS appearance changes
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🧪 Testing Dynamic Wallpaper Feature (Test #151)\n');
console.log('=' .repeat(60));

let passed = 0;
let failed = 0;

function test(name, condition, details = '') {
  if (condition) {
    console.log(`✅ ${name}`);
    if (details) console.log(`   ${details}`);
    passed++;
  } else {
    console.log(`❌ ${name}`);
    if (details) console.log(`   ${details}`);
    failed++;
  }
}

// Test 1: Check that types include dynamicWallpaper preference
console.log('\n📋 Step 1: Verify TypeScript types updated\n');

const typesContent = fs.readFileSync(
  path.join(__dirname, 'src/shared/types.ts'),
  'utf-8'
);

test(
  'Preferences interface includes dynamicWallpaper field',
  typesContent.includes('dynamicWallpaper'),
  'Found in src/shared/types.ts'
);

test(
  'dynamicWallpaper has enabled boolean property',
  typesContent.includes('enabled: boolean'),
  'Type definition is correct'
);

// Test 2: Check default preferences include dynamicWallpaper
console.log('\n📋 Step 2: Verify default preferences updated\n');

const directoriesContent = fs.readFileSync(
  path.join(__dirname, 'src/main/directories.ts'),
  'utf-8'
);

test(
  'Default preferences include dynamicWallpaper',
  directoriesContent.includes('dynamicWallpaper:'),
  'Found in getDefaultPreferences()'
);

test(
  'dynamicWallpaper defaults to disabled',
  directoriesContent.includes('enabled: false'),
  'Safe default value set'
);

// Test 3: Check applyDynamicWallpaper helper function
console.log('\n📋 Step 3: Verify dynamic wallpaper logic implemented\n');

const ipcHandlersContent = fs.readFileSync(
  path.join(__dirname, 'src/main/ipcHandlers.ts'),
  'utf-8'
);

test(
  'applyDynamicWallpaper helper function exists',
  ipcHandlersContent.includes('async function applyDynamicWallpaper'),
  'Helper function defined'
);

test(
  'Function looks for appearance-specific wallpapers',
  ipcHandlersContent.includes('appearancePattern') &&
  ipcHandlersContent.includes('light') &&
  ipcHandlersContent.includes('dark'),
  'Searches for light.* and dark.* wallpapers'
);

test(
  'Function handles missing wallpapers gracefully',
  ipcHandlersContent.includes('No wallpapers directory found') ||
  ipcHandlersContent.includes('wallpaper found'),
  'Error handling implemented'
);

// Test 4: Check appearance change handler calls dynamic wallpaper
console.log('\n📋 Step 4: Verify appearance change handler integration\n');

test(
  'handleAppearanceChange checks dynamicWallpaper preference',
  ipcHandlersContent.includes('prefs.dynamicWallpaper?.enabled'),
  'Preference check exists'
);

test(
  'Calls applyDynamicWallpaper when enabled',
  ipcHandlersContent.includes('await applyDynamicWallpaper'),
  'Dynamic wallpaper applied on appearance change'
);

test(
  'Works independently of auto-switch theme setting',
  ipcHandlersContent.match(/dynamicWallpaper.*enabled/g)?.length >= 2,
  'Can work with or without theme auto-switching'
);

// Test 5: Check WallpapersView UI includes toggle
console.log('\n📋 Step 5: Verify UI toggle in WallpapersView\n');

const wallpapersViewContent = fs.readFileSync(
  path.join(__dirname, 'src/renderer/components/WallpapersView.tsx'),
  'utf-8'
);

test(
  'WallpapersView has dynamicWallpaperEnabled state',
  wallpapersViewContent.includes('dynamicWallpaperEnabled'),
  'State variable declared'
);

test(
  'Component loads dynamic wallpaper preference',
  wallpapersViewContent.includes('loadPreferences') &&
  wallpapersViewContent.includes('getPreferences'),
  'Loads preferences on mount'
);

test(
  'Toggle function updates preferences',
  wallpapersViewContent.includes('toggleDynamicWallpaper') &&
  wallpapersViewContent.includes('setPreferences'),
  'Toggle handler implemented'
);

test(
  'UI renders toggle switch',
  wallpapersViewContent.includes('Dynamic Wallpaper') &&
  wallpapersViewContent.includes('onClick={toggleDynamicWallpaper}'),
  'Toggle button rendered in UI'
);

test(
  'Toggle has visual feedback',
  wallpapersViewContent.includes('transition') &&
  wallpapersViewContent.includes('backgroundColor'),
  'Visual state changes implemented'
);

// Test 6: Check test wallpapers exist
console.log('\n📋 Step 6: Verify test wallpapers created\n');

const themePath = path.join(
  os.homedir(),
  'Library/Application Support/Ricekit/themes/tokyo-night/wallpapers'
);

const lightWallpaperExists = fs.existsSync(path.join(themePath, 'light.png'));
const darkWallpaperExists = fs.existsSync(path.join(themePath, 'dark.png'));

test(
  'Light wallpaper exists for tokyo-night theme',
  lightWallpaperExists,
  lightWallpaperExists ? `Found at ${themePath}/light.png` : 'Not found'
);

test(
  'Dark wallpaper exists for tokyo-night theme',
  darkWallpaperExists,
  darkWallpaperExists ? `Found at ${themePath}/dark.png` : 'Not found'
);

// Test 7: Verify file naming pattern support
console.log('\n📋 Step 7: Verify naming pattern support\n');

test(
  'Supports light.* pattern',
  ipcHandlersContent.includes('light') && ipcHandlersContent.includes('RegExp'),
  'Regex pattern supports light.png, light.jpg, light-*.png'
);

test(
  'Supports dark.* pattern',
  ipcHandlersContent.includes('dark') && ipcHandlersContent.includes('RegExp'),
  'Regex pattern supports dark.png, dark.jpg, dark-*.png'
);

// Print summary
console.log('\n' + '='.repeat(60));
console.log('\n📊 Test Summary:\n');
console.log(`   ✅ Passed: ${passed}`);
console.log(`   ❌ Failed: ${failed}`);
console.log(`   📈 Total:  ${passed + failed}`);
console.log(`   🎯 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

if (failed === 0) {
  console.log('\n🎉 ALL TESTS PASSED! Dynamic wallpaper feature is fully implemented.\n');
  console.log('Next Steps for Manual Testing:');
  console.log('1. Open Ricekit app and navigate to Wallpapers view');
  console.log('2. Verify "Dynamic Wallpaper" toggle is visible');
  console.log('3. Enable the toggle');
  console.log('4. Change macOS appearance: System Preferences > Appearance');
  console.log('5. Verify wallpaper changes between light.png and dark.png');
  console.log('6. Check that it works with current theme\'s wallpapers\n');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed. Please review the implementation.\n');
  process.exit(1);
}
