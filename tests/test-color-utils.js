/**
 * Unit tests for color utility functions
 */

const {
  isValidHexColor,
  isValidRgbColor,
  isValidHslColor,
  parseRgb,
  parseHsl,
  rgbToHex,
  hexToRgb,
  hslToRgb,
  hslToHex,
  toHex,
  detectColorFormat,
} = require('./src/shared/colorUtils.ts');

console.log('='.repeat(60));
console.log('COLOR UTILITIES UNIT TESTS');
console.log('='.repeat(60));
console.log();

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`✓ ${description}`);
    passed++;
  } catch (error) {
    console.log(`✗ ${description}`);
    console.log(`  Error: ${error.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// Test hex validation
console.log('Testing hex color validation...');
test('Valid 6-digit hex', () => {
  assert(isValidHexColor('#FF5733'), 'Should accept #FF5733');
  assert(isValidHexColor('#ff5733'), 'Should accept lowercase');
});

test('Valid 3-digit hex', () => {
  assert(isValidHexColor('#F73'), 'Should accept #F73');
});

test('Invalid hex formats', () => {
  assert(!isValidHexColor('FF5733'), 'Should reject without #');
  assert(!isValidHexColor('#FF57'), 'Should reject 4 digits');
  assert(!isValidHexColor('#GG5733'), 'Should reject invalid chars');
});

console.log();

// Test RGB validation
console.log('Testing RGB color validation...');
test('Valid RGB with commas', () => {
  assert(isValidRgbColor('255, 87, 51'), 'Should accept "255, 87, 51"');
  assert(isValidRgbColor('255,87,51'), 'Should accept without spaces');
});

test('Valid RGB with rgb() wrapper', () => {
  assert(isValidRgbColor('rgb(255, 87, 51)'), 'Should accept rgb() wrapper');
});

test('Valid RGB with spaces', () => {
  assert(isValidRgbColor('255 87 51'), 'Should accept space-separated');
});

test('Invalid RGB formats', () => {
  assert(!isValidRgbColor('256, 87, 51'), 'Should reject >255');
  assert(!isValidRgbColor('255, 87'), 'Should reject incomplete');
  assert(!isValidRgbColor('a, b, c'), 'Should reject non-numbers');
});

console.log();

// Test HSL validation
console.log('Testing HSL color validation...');
test('Valid HSL with percentages', () => {
  assert(isValidHslColor('9, 100%, 60%'), 'Should accept "9, 100%, 60%"');
});

test('Valid HSL with hsl() wrapper', () => {
  assert(isValidHslColor('hsl(9, 100%, 60%)'), 'Should accept hsl() wrapper');
});

test('Valid HSL with hue > 255', () => {
  assert(isValidHslColor('300, 100, 60'), 'Should accept H > 255');
});

test('Invalid HSL formats', () => {
  assert(!isValidHslColor('361, 100%, 60%'), 'Should reject H > 360');
  assert(!isValidHslColor('9, 101%, 60%'), 'Should reject S > 100');
  assert(!isValidHslColor('9, 100%, 101%'), 'Should reject L > 100');
});

console.log();

// Test conversions
console.log('Testing color conversions...');
test('RGB to hex', () => {
  const hex = rgbToHex({ r: 255, g: 87, b: 51 });
  assert(hex === '#ff5733', `Expected #ff5733, got ${hex}`);
});

test('Hex to RGB', () => {
  const rgb = hexToRgb('#FF5733');
  assert(rgb.r === 255 && rgb.g === 87 && rgb.b === 51, 'RGB values incorrect');
});

test('3-digit hex to RGB', () => {
  const rgb = hexToRgb('#F73');
  assert(rgb.r === 255 && rgb.g === 119 && rgb.b === 51, 'Should expand 3-digit hex');
});

test('HSL to RGB', () => {
  // Test with HSL(0, 100%, 50%) which should be pure red RGB(255, 0, 0)
  const rgb = hslToRgb({ h: 0, s: 100, l: 50 });
  assert(rgb.r === 255 && rgb.g === 0 && rgb.b === 0, `Expected red, got ${JSON.stringify(rgb)}`);
});

test('HSL to hex', () => {
  // Test with HSL(0, 100%, 50%) = #ff0000 (red)
  const hex = hslToHex({ h: 0, s: 100, l: 50 });
  assert(hex.toLowerCase() === '#ff0000', `Expected #ff0000, got ${hex}`);
});

console.log();

// Test universal converter
console.log('Testing universal toHex() converter...');
test('Convert hex to hex', () => {
  const hex = toHex('#FF5733');
  assert(hex === '#FF5733', 'Should preserve hex');
});

test('Convert RGB to hex', () => {
  const hex = toHex('255, 87, 51');
  assert(hex === '#ff5733', `Expected #ff5733, got ${hex}`);
});

test('Convert RGB with wrapper to hex', () => {
  const hex = toHex('rgb(255, 87, 51)');
  assert(hex === '#ff5733', `Expected #ff5733, got ${hex}`);
});

test('Convert HSL to hex (with wrapper)', () => {
  // Without wrapper and with low H value, may be ambiguous
  // Best practice is to use hsl() wrapper for clarity
  const hex = toHex('hsl(0, 100%, 50%)');
  assert(hex.toLowerCase() === '#ff0000', `Expected #ff0000 (red), got ${hex}`);
});

test('Convert HSL with wrapper to hex', () => {
  const hex = toHex('hsl(120, 100%, 50%)');
  assert(hex.toLowerCase() === '#00ff00', `Expected #00ff00 (green), got ${hex}`);
});

test('Invalid color returns null', () => {
  const hex = toHex('not-a-color');
  assert(hex === null, 'Should return null for invalid color');
});

console.log();

// Test format detection
console.log('Testing format detection...');
test('Detect hex', () => {
  assert(detectColorFormat('#FF5733') === 'hex', 'Should detect hex');
});

test('Detect RGB', () => {
  assert(detectColorFormat('255, 87, 51') === 'rgb', 'Should detect RGB');
  assert(detectColorFormat('rgb(255, 87, 51)') === 'rgb', 'Should detect RGB with wrapper');
});

test('Detect HSL', () => {
  // HSL with % and wrapper is clear
  assert(detectColorFormat('hsl(9, 100%, 60%)') === 'hsl', 'Should detect HSL with wrapper');
  // HSL with hue > 255 is clear even without wrapper
  assert(detectColorFormat('300, 100%, 50%') === 'hsl', 'Should detect HSL with H>255');
});

test('Detect invalid', () => {
  assert(detectColorFormat('not-a-color') === 'invalid', 'Should detect invalid');
});

console.log();
console.log('='.repeat(60));
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

if (failed > 0) {
  process.exit(1);
}
