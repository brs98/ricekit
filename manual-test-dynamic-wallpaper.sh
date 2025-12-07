#!/bin/bash

# Manual test script for Dynamic Wallpaper feature (Test #151)
# This script helps verify the feature works as expected

echo "🧪 Manual Test: Dynamic Wallpaper Feature (Test #151)"
echo "=========================================================="
echo ""

# Step 1: Check current macOS appearance
echo "📋 Step 1: Current macOS Appearance"
echo "--------------------"
CURRENT_APPEARANCE=$(defaults read -g AppleInterfaceStyle 2>/dev/null || echo "Light")
echo "Current appearance: $CURRENT_APPEARANCE"
echo ""

# Step 2: Check if app is running
echo "📋 Step 2: Check MacTheme is running"
echo "--------------------"
if pgrep -f "Electron.*mactheme" > /dev/null; then
    echo "✅ MacTheme is running"
else
    echo "❌ MacTheme is not running"
    echo "   Please start the app with: npm run dev"
    exit 1
fi
echo ""

# Step 3: Check test wallpapers exist
echo "📋 Step 3: Verify Test Wallpapers"
echo "--------------------"
WALLPAPER_DIR="$HOME/Library/Application Support/MacTheme/themes/tokyo-night/wallpapers"

if [ -f "$WALLPAPER_DIR/light.png" ]; then
    echo "✅ light.png exists"
else
    echo "❌ light.png not found"
fi

if [ -f "$WALLPAPER_DIR/dark.png" ]; then
    echo "✅ dark.png exists"
else
    echo "❌ dark.png not found"
fi
echo ""

# Step 4: Check preferences file
echo "📋 Step 4: Check Preferences"
echo "--------------------"
PREFS_FILE="$HOME/Library/Application Support/MacTheme/preferences.json"

if [ -f "$PREFS_FILE" ]; then
    echo "✅ Preferences file exists"

    if grep -q "dynamicWallpaper" "$PREFS_FILE"; then
        echo "✅ dynamicWallpaper field present"

        DYNAMIC_ENABLED=$(cat "$PREFS_FILE" | grep -A 2 "dynamicWallpaper" | grep "enabled" | grep -o "true\|false")
        echo "   Status: $DYNAMIC_ENABLED"
    else
        echo "⚠️  dynamicWallpaper field not yet in preferences"
        echo "   (Will be added when app loads the new code)"
    fi
else
    echo "❌ Preferences file not found"
fi
echo ""

# Step 5: Instructions for manual testing
echo "📋 Step 5: Manual Testing Instructions"
echo "=========================================="
echo ""
echo "To test the dynamic wallpaper feature:"
echo ""
echo "1. Navigate to Wallpapers view in MacTheme app"
echo "   - Click 'Wallpapers' in the sidebar"
echo ""
echo "2. Look for 'Dynamic Wallpaper' toggle in the header"
echo "   - Should be next to the refresh button"
echo "   - Toggle switch should be visible"
echo ""
echo "3. Enable Dynamic Wallpaper"
echo "   - Click the toggle to enable it"
echo "   - Toggle should turn blue/accent color"
echo ""
echo "4. Test appearance switching:"
echo ""
if [ "$CURRENT_APPEARANCE" = "Dark" ]; then
    echo "   Current mode: DARK"
    echo "   → Switch to Light mode:"
    echo "     System Preferences > Appearance > Light"
    echo "   → Wallpaper should change to light.png"
    echo ""
    echo "   → Switch back to Dark mode:"
    echo "     System Preferences > Appearance > Dark"
    echo "     Wallpaper should change to dark.png"
else
    echo "   Current mode: LIGHT"
    echo "   → Switch to Dark mode:"
    echo "     System Preferences > Appearance > Dark"
    echo "   → Wallpaper should change to dark.png"
    echo ""
    echo "   → Switch back to Light mode:"
    echo "     System Preferences > Appearance > Light"
    echo "     Wallpaper should change to light.png"
fi
echo ""
echo "5. Verify wallpaper changes automatically"
echo "   - No need to manually apply wallpaper"
echo "   - Should switch based on system appearance"
echo ""
echo "6. Test with toggle disabled"
echo "   - Disable the Dynamic Wallpaper toggle"
echo "   - Change system appearance"
echo "   - Wallpaper should NOT change automatically"
echo ""
echo "=========================================="
echo "✅ If all steps work correctly, Test #151 PASSES!"
echo ""
