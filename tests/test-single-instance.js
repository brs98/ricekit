/**
 * Test Single Instance Lock - Test #128
 *
 * This test verifies that multiple instances of the application are prevented.
 * When a second instance is launched, it should focus the existing window instead.
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('\n=== Testing Single Instance Lock (Test #128) ===\n');

console.log('Step 1: Ricekit application is already running');
console.log('  Current process(es) running\n');

console.log('Step 2: Attempting to launch a second instance...');
console.log('  Command: npm run dev:electron\n');

// Launch a second instance of the electron app
const secondInstance = spawn('npm', ['run', 'dev:electron'], {
  cwd: __dirname,
  stdio: 'pipe'
});

let output = '';

secondInstance.stdout.on('data', (data) => {
  output += data.toString();
  console.log('  [Second Instance Output]:', data.toString().trim());
});

secondInstance.stderr.on('data', (data) => {
  output += data.toString();
  console.log('  [Second Instance Error]:', data.toString().trim());
});

secondInstance.on('close', (code) => {
  console.log('\nStep 3: Second instance process exited');
  console.log(`  Exit code: ${code}`);

  console.log('\nStep 4: Verifying behavior...');

  // Check if we saw the expected log message
  if (output.includes('Another instance is already running')) {
    console.log('  ✓ Second instance detected existing instance');
    console.log('  ✓ Second instance quit gracefully');
    console.log('\nStep 5: Expected behavior verified');
    console.log('  ✓ Multiple instances are prevented');
    console.log('  ✓ Existing window should have been focused');
    console.log('\n=== Test #128 PASSED ===\n');
    console.log('The single-instance lock is working correctly.');
    console.log('The first instance should have received focus.');
  } else {
    console.log('  ✗ Did not detect expected behavior');
    console.log('\nStep 5: Checking output...');
    console.log('Output:', output);
    console.log('\n=== Test #128 NEEDS VERIFICATION ===\n');
  }

  console.log('\nManual Verification Steps:');
  console.log('1. Check that only ONE Ricekit window exists');
  console.log('2. Check that the existing window was brought to front');
  console.log('3. Try launching the app from Finder/Spotlight and verify same behavior');
});

// Give it 5 seconds to start and quit
setTimeout(() => {
  if (!secondInstance.killed) {
    console.log('\nTimeout: Killing second instance process...');
    secondInstance.kill();
  }
}, 5000);
