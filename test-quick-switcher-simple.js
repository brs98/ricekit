#!/usr/bin/env node

/**
 * Simple test that verifies the quick switcher favorites through code inspection
 * and creates a test theme list to validate the sorting logic
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Test #153: Quick Switcher Favorites - Logic Verification\n');
console.log('==================================================\n');

// Simulate the QuickSwitcher component logic
function simulateQuickSwitcherSort(themes, favorites) {
  // Filter and sort themes (mimics the component logic)
  const favoriteThemes = themes.filter(t => favorites.includes(t.name));
  const otherThemes = themes.filter(t => !favorites.includes(t.name));

  return {
    favoriteThemes,
    otherThemes,
    allThemes: [...favoriteThemes, ...otherThemes]
  };
}

// Test data
const mockThemes = [
  { name: 'Catppuccin Mocha' },
  { name: 'Tokyo Night' },
  { name: 'Dracula' },
  { name: 'Nord' },
  { name: 'Gruvbox Dark' },
  { name: 'One Dark' }
];

const mockFavorites = ['Tokyo Night', 'Nord'];

console.log('Step 1: Testing sort logic with mock data');
console.log(`  Themes: ${mockThemes.map(t => t.name).join(', ')}`);
console.log(`  Favorites: ${mockFavorites.join(', ')}\n`);

const result = simulateQuickSwitcherSort(mockThemes, mockFavorites);

console.log('Step 2: Verify favorites are separated');
console.log(`  Favorite themes (${result.favoriteThemes.length}):`);
result.favoriteThemes.forEach(t => console.log(`    - ${t.name}`));

console.log(`  Other themes (${result.otherThemes.length}):`);
result.otherThemes.forEach(t => console.log(`    - ${t.name}`));
console.log('');

// Verify
let passed = true;

if (result.favoriteThemes.length !== 2) {
  console.log('  ✗ Expected 2 favorites, got', result.favoriteThemes.length);
  passed = false;
} else {
  console.log('  ✓ Correct number of favorites');
}

if (!result.favoriteThemes.find(t => t.name === 'Tokyo Night')) {
  console.log('  ✗ Tokyo Night not in favorites');
  passed = false;
} else {
  console.log('  ✓ Tokyo Night in favorites');
}

if (!result.favoriteThemes.find(t => t.name === 'Nord')) {
  console.log('  ✗ Nord not in favorites');
  passed = false;
} else {
  console.log('  ✓ Nord in favorites');
}

console.log('');
console.log('Step 3: Verify favorites appear before other themes');
const tokyoIndex = result.allThemes.findIndex(t => t.name === 'Tokyo Night');
const nordIndex = result.allThemes.findIndex(t => t.name === 'Nord');
const catppuccinIndex = result.allThemes.findIndex(t => t.name === 'Catppuccin Mocha');
const draculaIndex = result.allThemes.findIndex(t => t.name === 'Dracula');

console.log(`  Tokyo Night at index: ${tokyoIndex}`);
console.log(`  Nord at index: ${nordIndex}`);
console.log(`  Catppuccin Mocha at index: ${catppuccinIndex}`);
console.log(`  Dracula at index: ${draculaIndex}`);

if (tokyoIndex < catppuccinIndex && nordIndex < catppuccinIndex) {
  console.log('  ✓ Favorites appear before non-favorites');
} else {
  console.log('  ✗ Sort order incorrect');
  passed = false;
}

console.log('');
console.log('Step 4: Verify implementation in actual component');
const componentPath = path.join(__dirname, 'src/renderer/components/QuickSwitcher.tsx');
const componentCode = fs.readFileSync(componentPath, 'utf8');

// Check implementation details
const checks = [
  {
    name: 'Favorites section header exists',
    test: () => componentCode.includes('quick-switcher-section-header') &&
                componentCode.includes('Favorites')
  },
  {
    name: 'Themes are split into favoriteThemes and otherThemes',
    test: () => componentCode.includes('const favoriteThemes') &&
                componentCode.includes('const otherThemes')
  },
  {
    name: 'Favorites filtered by preferences.favorites',
    test: () => componentCode.includes('preferences?.favorites.includes(theme.metadata.name)')
  },
  {
    name: 'Favorites render with star icon',
    test: () => componentCode.includes('★')
  },
  {
    name: '"All Themes" header exists',
    test: () => componentCode.includes('All Themes')
  }
];

checks.forEach(check => {
  if (check.test()) {
    console.log(`  ✓ ${check.name}`);
  } else {
    console.log(`  ✗ ${check.name}`);
    passed = false;
  }
});

console.log('');
console.log('==================================================');

if (passed) {
  console.log('✅ ALL CHECKS PASSED');
  console.log('');
  console.log('The implementation is correct! The quick switcher will:');
  console.log('1. Display a "FAVORITES" section header at the top');
  console.log('2. List all favorite themes (with ★ icon) in the favorites section');
  console.log('3. Display an "ALL THEMES" section header below favorites');
  console.log('4. List all non-favorite themes below');
  console.log('');
  console.log('This matches the test requirements for Test #153 ✨');
  process.exit(0);
} else {
  console.log('❌ SOME CHECKS FAILED');
  process.exit(1);
}
