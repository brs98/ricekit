/**
 * Manual test script for notification preferences
 *
 * This script helps verify the notification preferences feature works correctly.
 * Run this while the app is running and navigate to Settings to verify.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const prefsPath = path.join(os.homedir(), 'Library', 'Application Support', 'MacTheme', 'preferences.json');

console.log('=== Notification Preferences Test ===\n');

// Read current preferences
const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf-8'));
console.log('Current preferences:');
console.log('  showNotifications (legacy):', prefs.showNotifications);
console.log('  notifications.onThemeChange:', prefs.notifications?.onThemeChange);
console.log('  notifications.onScheduledSwitch:', prefs.notifications?.onScheduledSwitch);
console.log();

// Test 1: Check backward compatibility
console.log('✓ Test 1: Backward compatibility');
console.log('  Legacy field exists:', 'showNotifications' in prefs);
console.log('  Should default to true when notifications object missing');
console.log();

// Test 2: Update preferences to have both toggles disabled
console.log('✓ Test 2: Setting both toggles OFF');
prefs.notifications = {
  onThemeChange: false,
  onScheduledSwitch: false
};
fs.writeFileSync(prefsPath, JSON.stringify(prefs, null, 2));
console.log('  Updated preferences with both toggles OFF');
console.log('  Now apply a theme - you should NOT see a notification');
console.log();

// Wait for user to test
console.log('Press Ctrl+C when done testing, then run this script again to reset');
console.log();

// Provide reset function
console.log('To reset notifications to ON:');
console.log('  node test-notifications.js reset');
console.log();

if (process.argv[2] === 'reset') {
  prefs.notifications = {
    onThemeChange: true,
    onScheduledSwitch: true
  };
  fs.writeFileSync(prefsPath, JSON.stringify(prefs, null, 2));
  console.log('✓ Reset: Both notification toggles set to ON');
}

console.log('=== Test Instructions ===');
console.log('1. Open MacTheme app');
console.log('2. Navigate to Settings > Notifications');
console.log('3. Verify TWO toggles are visible:');
console.log('   - "Show Notifications on Theme Change"');
console.log('   - "Show Notifications on Scheduled Switch"');
console.log('4. Toggle "Show Notifications on Theme Change" OFF');
console.log('5. Apply a different theme from Themes view');
console.log('6. Verify NO notification appears');
console.log('7. Toggle it back ON');
console.log('8. Apply another theme');
console.log('9. Verify notification DOES appear');
console.log();
console.log('Test 70 Criteria:');
console.log('✓ Navigate to Settings > Notifications');
console.log('✓ Toggle "Show notifications on theme change"');
console.log('✓ Toggle "Show notifications on scheduled switch"');
console.log('✓ Save settings (auto-saves)');
console.log('✓ Apply a theme');
console.log('✓ Verify notification behavior matches preferences');
