/**
 * Check if onboarding modal is displayed by examining the console logs
 * and preferences state
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('='.repeat(60));
console.log('TEST: Onboarding Modal Display Check');
console.log('='.repeat(60));
console.log('');

// 1. Check if app is running
try {
  const processes = execSync('ps aux | grep -i "Electron.*mactheme" | grep -v grep').toString();
  if (processes.trim()) {
    console.log('✓ MacTheme app is running');
  } else {
    console.log('✗ MacTheme app is NOT running');
    process.exit(1);
  }
} catch (error) {
  console.log('✗ MacTheme app is NOT running');
  process.exit(1);
}

// 2. Check preferences file
const prefsPath = path.join(require('os').homedir(), 'Library/Application Support/MacTheme/preferences.json');
if (fs.existsSync(prefsPath)) {
  const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
  console.log('✓ Preferences file exists');
  console.log(`  onboardingCompleted: ${prefs.onboardingCompleted}`);

  if (prefs.onboardingCompleted === false) {
    console.log('');
    console.log('✅ onboardingCompleted = false');
    console.log('   → Onboarding modal SHOULD be displayed');
  } else {
    console.log('');
    console.log('⚠️  onboardingCompleted = true');
    console.log('   → Onboarding modal will NOT be displayed');
  }
} else {
  console.log('✗ Preferences file not found');
  process.exit(1);
}

// 3. Check the dev log for any errors
console.log('');
console.log('Checking application logs...');
const logPath = '/tmp/mactheme-dev.log';
if (fs.existsSync(logPath)) {
  const logs = fs.readFileSync(logPath, 'utf8');
  const errorLines = logs.split('\n').filter(line =>
    line.toLowerCase().includes('error') &&
    !line.includes('ERROR in') &&
    !line.includes('[0m[31m')
  );

  if (errorLines.length > 0) {
    console.log('⚠️  Found errors in logs:');
    errorLines.slice(-5).forEach(line => console.log('  ', line));
  } else {
    console.log('✓ No errors found in application logs');
  }
}

console.log('');
console.log('='.repeat(60));
console.log('EXPECTED BEHAVIOR:');
console.log('='.repeat(60));
console.log('When you look at the MacTheme app window, you should see:');
console.log('');
console.log('  1. A modal overlay covering the entire window');
console.log('  2. "Welcome to MacTheme! 🎨" as the heading');
console.log('  3. Progress indicators showing 3 steps (Welcome, Choose Theme, Configure Apps)');
console.log('  4. Four feature items with emojis (✨, 🎯, 🔄, ⚡)');
console.log('  5. "Next" button at the bottom right');
console.log('');
console.log('If you see all of the above, Test #120 PASSES ✅');
console.log('='.repeat(60));
console.log('');

// 4. Try to take a screenshot using osascript
console.log('Attempting to capture window information...');
try {
  const windowInfo = execSync(`osascript -e 'tell application "System Events" to get name of every process whose visible is true'`).toString();
  const hasElectron = windowInfo.includes('Electron');
  console.log(hasElectron ? '✓ Electron window is visible' : '⚠️  Electron window not found in visible processes');
} catch (error) {
  console.log('⚠️  Could not query window visibility');
}

console.log('');
console.log('Test setup complete. Please verify the UI manually.');
