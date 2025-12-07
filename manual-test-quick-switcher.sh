#!/bin/bash

echo "🧪 Manual Test #153: Quick Switcher Favorites"
echo "=============================================="
echo ""

# Step 1: Set favorites
echo "Step 1: Setting Tokyo Night and Nord as favorites..."
node -e "
const fs = require('fs');
const path = require('path');
const prefsPath = path.join(process.env.HOME, 'Library/Application Support/MacTheme/preferences.json');
const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
prefs.favorites = ['Tokyo Night', 'Nord'];
fs.writeFileSync(prefsPath, JSON.stringify(prefs, null, 2));
console.log('  ✓ Favorites set: Tokyo Night, Nord');
"

echo ""
echo "Step 2: Please manually test the following:"
echo "  1. Make sure the MacTheme app window is focused"
echo "  2. Press Cmd+Shift+T to open the quick switcher"
echo "  3. Verify you see:"
echo "     - 'FAVORITES' header at the top"
echo "     - ★ Tokyo Night listed under Favorites"
echo "     - ★ Nord listed under Favorites"
echo "     - 'ALL THEMES' header below the favorites"
echo "     - Other themes listed after favorites"
echo ""
echo "Expected layout:"
echo "┌─────────────────────────────────┐"
echo "│ FAVORITES                       │"
echo "│  ★ Tokyo Night                  │"
echo "│  ★ Nord                         │"
echo "│                                 │"
echo "│ ALL THEMES                      │"
echo "│  Catppuccin Mocha               │"
echo "│  Dracula                        │"
echo "│  ...                            │"
echo "└─────────────────────────────────┘"
echo ""
echo "Press Enter after you've verified the layout..."
read

echo ""
echo "Did the test pass? (y/n): "
read answer

if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
    echo ""
    echo "✅ Test #153 PASSED - Marking in feature_list.json"
    node -e "
    const fs = require('fs');
    const tests = JSON.parse(fs.readFileSync('./feature_list.json', 'utf8'));
    tests[152].passes = true; // Test #153 is index 152
    fs.writeFileSync('./feature_list.json', JSON.stringify(tests, null, 2));
    console.log('✓ feature_list.json updated');
    "
    echo ""
    echo "Test #153 is now marked as passing! 🎉"
else
    echo ""
    echo "❌ Test failed - not updating feature_list.json"
    echo "Please review the implementation"
fi
