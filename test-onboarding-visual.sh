#!/bin/bash

echo "============================================================"
echo "TEST: Onboarding Modal Visual Verification"
echo "============================================================"
echo ""

# Check if Electron app is running
if pgrep -f "Electron.*mactheme" > /dev/null; then
    echo "✓ MacTheme app is running"
else
    echo "✗ MacTheme app is NOT running"
    exit 1
fi

# Check preferences.json for onboardingCompleted
PREFS_PATH="$HOME/Library/Application Support/MacTheme/preferences.json"
if [ -f "$PREFS_PATH" ]; then
    ONBOARDING_STATUS=$(cat "$PREFS_PATH" | grep "onboardingCompleted" | grep -o "true\|false")
    echo "✓ Preferences file exists"
    echo "  onboardingCompleted: $ONBOARDING_STATUS"

    if [ "$ONBOARDING_STATUS" = "false" ]; then
        echo ""
        echo "✅ Onboarding status is 'false' - modal SHOULD be displayed"
    else
        echo ""
        echo "⚠️  Onboarding status is 'true' - modal will NOT be displayed"
    fi
else
    echo "✗ Preferences file not found"
    exit 1
fi

echo ""
echo "------------------------------------------------------------"
echo "MANUAL VERIFICATION REQUIRED:"
echo "------------------------------------------------------------"
echo "Please check the MacTheme app window and verify:"
echo ""
echo "1. Is the onboarding modal visible? (YES/NO)"
echo "2. Does it show 'Welcome to MacTheme! 🎨'? (YES/NO)"
echo "3. Are there step indicators at the top? (YES/NO)"
echo "4. Is there a 'Next' button at the bottom? (YES/NO)"
echo ""
echo "If you answer YES to all questions, the test PASSES."
echo "============================================================"
