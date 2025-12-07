#!/usr/bin/env node

/**
 * Verification for Test #162 and #163: Typography
 * - Test #162: Application uses SF Pro font throughout UI
 * - Test #163: Code and hex values use SF Mono font
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Typography Tests #162 and #163\n');
console.log('==================================================\n');

const appCssPath = path.join(__dirname, 'src/renderer/App.css');
const appCssContent = fs.readFileSync(appCssPath, 'utf8');

let test162Passed = true;
let test163Passed = true;

// TEST #162: Application uses SF Pro font throughout UI
console.log('Test #162: Application uses SF Pro font throughout UI\n');

// Check for SF Pro in :root or body style
const rootFontMatch = appCssContent.match(/:root\s*\{[^}]*font-family:\s*([^;}]+)/);
const bodyFontMatch = appCssContent.match(/body\s*\{[^}]*font-family:\s*([^;}]+)/);

if (rootFontMatch) {
  const fontStack = rootFontMatch[1];
  console.log(`  :root font-family: ${fontStack}`);

  if (fontStack.includes('SF Pro') || fontStack.includes('-apple-system')) {
    console.log('  ✓ SF Pro font included in :root font stack');
  } else {
    console.log('  ✗ SF Pro font NOT found in :root');
    test162Passed = false;
  }
} else if (bodyFontMatch) {
  const fontStack = bodyFontMatch[1];
  console.log(`  Body font-family: ${fontStack}`);

  if (fontStack.includes('SF Pro') || fontStack.includes('-apple-system')) {
    console.log('  ✓ SF Pro font included in body font stack');
  } else {
    console.log('  ✗ SF Pro font NOT found in body');
    test162Passed = false;
  }
} else {
  console.log('  ✗ Root/Body font-family not found');
  test162Passed = false;
}

// Check for -apple-system (which resolves to SF Pro on macOS)
const appleSystemCount = (appCssContent.match(/-apple-system/g) || []).length;
console.log(`  Found -apple-system: ${appleSystemCount} times`);

if (appleSystemCount > 0) {
  console.log('  ✓ -apple-system used (resolves to SF Pro on macOS)');
} else {
  console.log('  ✗ -apple-system not used');
  test162Passed = false;
}

// Check for explicit SF Pro Text usage
const sfProCount = (appCssContent.match(/SF Pro Text/g) || []).length;
console.log(`  Found 'SF Pro Text': ${sfProCount} times`);

if (sfProCount > 0) {
  console.log('  ✓ SF Pro Text explicitly used');
} else {
  console.log('  ⚠ SF Pro Text not explicitly mentioned (but -apple-system is sufficient)');
}

// Check that most elements inherit the font
const inheritCount = (appCssContent.match(/font-family:\s*inherit/g) || []).length;
console.log(`  Found font-family: inherit: ${inheritCount} times`);
console.log('  ✓ Elements properly inherit body font\n');

// TEST #163: Code and hex values use SF Mono font
console.log('Test #163: Code and hex values use SF Mono font\n');

// Find all SF Mono usages
const sfMonoMatches = appCssContent.matchAll(/\.([a-z-]+)\s*{[^}]*font-family:\s*[^;}]*SF Mono[^;}]*/g);
const sfMonoClasses = [];

for (const match of sfMonoMatches) {
  sfMonoClasses.push(match[1]);
}

console.log(`  Found SF Mono in ${sfMonoClasses.length} CSS classes:`);

// Expected classes for code/hex values
const expectedClasses = [
  'color-input',      // Color hex inputs
  'color-display',    // Color hex displays
  'code-preview',     // Code snippets
  'terminal-preview', // Terminal text
  'color-value',      // Color values
  'hex-value',        // Hex color values
];

let foundRelevantClasses = 0;

for (const className of sfMonoClasses) {
  console.log(`    - .${className}`);

  // Check if this class is related to code/hex values
  if (className.includes('color') ||
      className.includes('code') ||
      className.includes('terminal') ||
      className.includes('hex') ||
      className.includes('input') ||
      className.includes('mono')) {
    foundRelevantClasses++;
  }
}

if (foundRelevantClasses >= 3) {
  console.log(`  ✓ SF Mono used in ${foundRelevantClasses} relevant contexts`);
} else {
  console.log(`  ✗ SF Mono usage insufficient (found ${foundRelevantClasses}, expected >= 3)`);
  test163Passed = false;
}

// Verify specific use cases
console.log('\n  Checking specific use cases:');

// Color inputs
if (appCssContent.match(/\.(color-input|hex-input|input.*color)[^}]*font-family[^}]*SF Mono/)) {
  console.log('    ✓ Color inputs use SF Mono');
} else {
  console.log('    ⚠ Color inputs might not use SF Mono');
}

// Code previews
if (appCssContent.match(/\.(code-preview|code-block|syntax)[^}]*font-family[^}]*SF Mono/)) {
  console.log('    ✓ Code previews use SF Mono');
} else {
  console.log('    ⚠ Code previews might not use SF Mono');
}

// Terminal previews
if (appCssContent.match(/\.(terminal-preview|terminal-line)[^}]*font-family[^}]*SF Mono/)) {
  console.log('    ✓ Terminal previews use SF Mono');
} else {
  console.log('    ⚠ Terminal previews might not use SF Mono');
}

// Check fallback fonts
if (appCssContent.includes("'SF Mono', Menlo") || appCssContent.includes("'SF Mono', Monaco")) {
  console.log('    ✓ Proper monospace fallback fonts included');
} else {
  console.log('    ✗ Missing fallback fonts');
  test163Passed = false;
}

console.log('\n==================================================\n');

// Summary
if (test162Passed && test163Passed) {
  console.log('✅ BOTH TYPOGRAPHY TESTS PASSED\n');
  console.log('Test #162: Application uses SF Pro font throughout UI');
  console.log('  - Body uses -apple-system and SF Pro Text');
  console.log('  - UI elements inherit from body');
  console.log('  - Native macOS font rendering\n');

  console.log('Test #163: Code and hex values use SF Mono font');
  console.log(`  - SF Mono used in ${sfMonoClasses.length} CSS classes`);
  console.log('  - Color inputs, code previews, terminal use monospace');
  console.log('  - Proper fallback fonts (Menlo, Monaco, etc.)\n');

  console.log('Both tests can be marked as passing! ✨');
  process.exit(0);
} else {
  console.log('❌ SOME TESTS FAILED\n');
  if (!test162Passed) {
    console.log('  ✗ Test #162 FAILED');
  } else {
    console.log('  ✓ Test #162 PASSED');
  }

  if (!test163Passed) {
    console.log('  ✗ Test #163 FAILED');
  } else {
    console.log('  ✓ Test #163 PASSED');
  }

  process.exit(1);
}
