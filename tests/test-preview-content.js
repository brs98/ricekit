#!/usr/bin/env node

/**
 * Test #148 & #149: Verify terminal and code previews have rich content
 *
 * This test checks that:
 * - Terminal preview shows realistic commands (git status, npm test)
 * - Terminal preview demonstrates ANSI colors
 * - Code preview shows syntax-highlighted code
 * - Code preview uses multiple theme colors
 */

const fs = require('fs');
const path = require('path');

console.log('============================================================');
console.log('TEST #148 & #149: Terminal & Code Preview Content');
console.log('============================================================\n');

const componentPath = path.join(
  __dirname,
  'src/renderer/components/ThemeDetailModal.tsx'
);

console.log('Step 1: Read ThemeDetailModal component...');
if (!fs.existsSync(componentPath)) {
  console.error('❌ ThemeDetailModal.tsx not found');
  process.exit(1);
}

const componentContent = fs.readFileSync(componentPath, 'utf8');
console.log('✓ Component loaded\n');

// Test #148: Terminal Preview
console.log('TEST #148: Terminal preview uses sample commands');
console.log('='.repeat(60));

console.log('\nStep 2: Verify terminal preview shows realistic commands...');
const hasGitCommand = componentContent.includes('git status');
const hasNpmCommand = componentContent.includes('npm test');
const hasTerminalPrompt = componentContent.includes('user@macbook') || componentContent.includes('$');

if (hasGitCommand) {
  console.log('  ✓ Shows git status command');
} else {
  console.log('  ❌ Missing git command');
}

if (hasNpmCommand) {
  console.log('  ✓ Shows npm test command');
} else {
  console.log('  ❌ Missing npm command');
}

if (hasTerminalPrompt) {
  console.log('  ✓ Shows terminal prompt');
} else {
  console.log('  ❌ Missing terminal prompt');
}

console.log('\nStep 3: Verify terminal preview demonstrates ANSI colors...');
const hasGreenColor = componentContent.match(/colors\.green/g)?.length >= 2;
const hasRedColor = componentContent.includes('colors.red');
const hasCyanColor = componentContent.includes('colors.cyan');
const hasBlueColor = componentContent.includes('colors.blue');

if (hasGreenColor) {
  console.log('  ✓ Uses green color (for success/new files)');
} else {
  console.log('  ❌ Missing green color');
}

if (hasRedColor) {
  console.log('  ✓ Uses red color (for modified/errors)');
} else {
  console.log('  ❌ Missing red color');
}

if (hasCyanColor) {
  console.log('  ✓ Uses cyan color (for info messages)');
} else {
  console.log('  ❌ Missing cyan color');
}

if (hasBlueColor) {
  console.log('  ✓ Uses blue color (for paths/links)');
} else {
  console.log('  ❌ Missing blue color');
}

console.log('\nStep 4: Verify terminal output looks realistic...');
const hasBranchInfo = componentContent.includes('On branch main') || componentContent.includes('branch');
const hasFileChanges = componentContent.includes('modified:') || componentContent.includes('new file:');
const hasStatusMessage = componentContent.includes('Changes not staged') || componentContent.includes('commit');

if (hasBranchInfo) {
  console.log('  ✓ Shows git branch information');
} else {
  console.log('  ❌ Missing branch info');
}

if (hasFileChanges) {
  console.log('  ✓ Shows file change indicators');
} else {
  console.log('  ❌ Missing file changes');
}

if (hasStatusMessage) {
  console.log('  ✓ Shows git status messages');
} else {
  console.log('  ❌ Missing status messages');
}

const test148Pass = hasGitCommand && hasNpmCommand && hasTerminalPrompt &&
                     hasGreenColor && hasRedColor && hasCyanColor && hasBlueColor &&
                     hasBranchInfo && hasFileChanges && hasStatusMessage;

// Test #149: Code Preview
console.log('\n\nTEST #149: Code preview shows syntax highlighting');
console.log('='.repeat(60));

console.log('\nStep 2: Verify code preview shows TypeScript/JavaScript...');
const hasFunction = componentContent.includes('function') && componentContent.includes('greet');
const hasTypeAnnotation = componentContent.includes('string') || componentContent.includes(': ');
const hasReturn = componentContent.includes('return');

if (hasFunction) {
  console.log('  ✓ Shows function declaration');
} else {
  console.log('  ❌ Missing function');
}

if (hasTypeAnnotation) {
  console.log('  ✓ Shows type annotations');
} else {
  console.log('  ❌ Missing type annotations');
}

if (hasReturn) {
  console.log('  ✓ Shows return statement');
} else {
  console.log('  ❌ Missing return statement');
}

console.log('\nStep 3: Verify code preview uses syntax highlighting colors...');
const hasMagentaKeyword = componentContent.includes('colors.magenta');
const hasYellowType = componentContent.includes('colors.yellow');
const hasGreenString = componentContent.includes('colors.green');
const hasBlueFunction = componentContent.includes('colors.blue');
const hasCyanParam = componentContent.includes('colors.cyan');

if (hasMagentaKeyword) {
  console.log('  ✓ Uses magenta for keywords (function, return)');
} else {
  console.log('  ❌ Missing magenta for keywords');
}

if (hasYellowType) {
  console.log('  ✓ Uses yellow for types');
} else {
  console.log('  ❌ Missing yellow for types');
}

if (hasGreenString) {
  console.log('  ✓ Uses green for strings');
} else {
  console.log('  ❌ Missing green for strings');
}

if (hasBlueFunction) {
  console.log('  ✓ Uses blue for function names');
} else {
  console.log('  ❌ Missing blue for function names');
}

if (hasCyanParam) {
  console.log('  ✓ Uses cyan for parameters');
} else {
  console.log('  ❌ Missing cyan for parameters');
}

console.log('\nStep 4: Verify code preview demonstrates multiple colors...');
// Count unique colors used in code preview section
const codePreviewSection = componentContent.match(/Code Preview.*?<\/div>\s*<\/div>\s*<\/div>/s)?.[0] || '';
const colorsUsedInCode = new Set();
const colorMatches = codePreviewSection.matchAll(/colors\.(\w+)/g);
for (const match of colorMatches) {
  colorsUsedInCode.add(match[1]);
}

console.log(`  ✓ Code preview uses ${colorsUsedInCode.size} different colors`);
if (colorsUsedInCode.size >= 5) {
  console.log('  ✓ Demonstrates rich syntax highlighting (5+ colors)');
} else {
  console.log('  ⚠️  Uses fewer than 5 colors');
}

const test149Pass = hasFunction && hasTypeAnnotation && hasReturn &&
                     hasMagentaKeyword && hasYellowType && hasGreenString &&
                     hasBlueFunction && hasCyanParam && colorsUsedInCode.size >= 5;

// Summary
console.log('\n============================================================');
console.log('SUMMARY');
console.log('============================================================');

if (test148Pass && test149Pass) {
  console.log('✅ BOTH TESTS PASSED');
  console.log('\nTest #148: Terminal Preview');
  console.log('  ✓ Shows realistic terminal commands (git, npm)');
  console.log('  ✓ Demonstrates ANSI colors (red, green, blue, cyan)');
  console.log('  ✓ Realistic terminal output format');
  console.log('\nTest #149: Code Preview');
  console.log('  ✓ Shows syntax-highlighted TypeScript code');
  console.log('  ✓ Uses 5+ colors for different syntax elements');
  console.log('  ✓ Demonstrates keywords, types, strings, functions, parameters');
  console.log('============================================================');
  process.exit(0);
} else {
  console.log('❌ ONE OR MORE TESTS FAILED');
  if (!test148Pass) {
    console.log('  ❌ Test #148: Terminal preview needs improvement');
  }
  if (!test149Pass) {
    console.log('  ❌ Test #149: Code preview needs improvement');
  }
  console.log('============================================================');
  process.exit(1);
}
