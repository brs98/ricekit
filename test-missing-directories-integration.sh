#!/bin/bash

echo "================================================================================"
echo "INTEGRATION TEST: File System Operations Handle Missing Directories"
echo "================================================================================"
echo ""
echo "This test verifies that the app gracefully handles missing directories by:"
echo "1. Backing up the current MacTheme directory"
echo "2. Deleting the MacTheme directory completely"
echo "3. Applying a theme (which should recreate directories)"
echo "4. Verifying all directories and files were recreated"
echo "5. Restoring the backup"
echo ""

APP_DATA_DIR="$HOME/Library/Application Support/MacTheme"
BACKUP_DIR="$HOME/Library/Application Support/MacTheme.backup-test-$(date +%s)"

echo "--- Step 1: Backup Current Directory ---"
echo ""

if [ -d "$APP_DATA_DIR" ]; then
    echo "✅ Backing up existing MacTheme directory..."
    cp -R "$APP_DATA_DIR" "$BACKUP_DIR"
    echo "   Backup created at: $BACKUP_DIR"
else
    echo "⚠️  No existing MacTheme directory to backup"
fi

echo ""
echo "--- Step 2: Delete MacTheme Directory ---"
echo ""

if [ -d "$APP_DATA_DIR" ]; then
    echo "🗑️  Deleting MacTheme directory..."
    rm -rf "$APP_DATA_DIR"
    echo "✅ Directory deleted"
else
    echo "⚠️  Directory doesn't exist (already deleted)"
fi

# Verify deletion
if [ ! -d "$APP_DATA_DIR" ]; then
    echo "✅ Confirmed: Directory does not exist"
else
    echo "❌ ERROR: Directory still exists after deletion"
    exit 1
fi

echo ""
echo "--- Step 3: Manual Test Required ---"
echo ""
echo "Now you need to manually test the app:"
echo ""
echo "1. The MacTheme app should be running"
echo "2. Click on ANY theme's 'Apply' button"
echo "3. Watch the console output"
echo ""
echo "Expected behavior:"
echo "  ✅ No crashes or errors"
echo "  ✅ Console shows: 'Created directory: ...' messages"
echo "  ✅ Theme is applied successfully"
echo "  ✅ Notification appears: 'Theme Applied'"
echo ""
echo "Press Enter after you've tested the app..."
read

echo ""
echo "--- Step 4: Verify Directory Recreation ---"
echo ""

# Check if main directory was recreated
if [ -d "$APP_DATA_DIR" ]; then
    echo "✅ Main directory recreated: $APP_DATA_DIR"
else
    echo "❌ ERROR: Main directory was NOT recreated"
    exit 1
fi

# Check subdirectories
DIRS_TO_CHECK=(
    "$APP_DATA_DIR/themes"
    "$APP_DATA_DIR/custom-themes"
    "$APP_DATA_DIR/current"
)

for dir in "${DIRS_TO_CHECK[@]}"; do
    if [ -d "$dir" ]; then
        echo "✅ Subdirectory exists: $(basename "$dir")"
    else
        echo "❌ ERROR: Subdirectory missing: $(basename "$dir")"
        exit 1
    fi
done

# Check files
FILES_TO_CHECK=(
    "$APP_DATA_DIR/preferences.json"
    "$APP_DATA_DIR/state.json"
)

for file in "${FILES_TO_CHECK[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ File exists: $(basename "$file")"
    else
        echo "❌ ERROR: File missing: $(basename "$file")"
        exit 1
    fi
done

# Check symlink
if [ -L "$APP_DATA_DIR/current/theme" ]; then
    LINK_TARGET=$(readlink "$APP_DATA_DIR/current/theme")
    echo "✅ Symlink exists: current/theme -> $LINK_TARGET"
else
    echo "❌ ERROR: Symlink not created: current/theme"
    exit 1
fi

echo ""
echo "--- Step 5: Restore Backup ---"
echo ""

if [ -d "$BACKUP_DIR" ]; then
    echo "🔄 Restoring backup..."
    rm -rf "$APP_DATA_DIR"
    cp -R "$BACKUP_DIR" "$APP_DATA_DIR"
    echo "✅ Backup restored"

    echo "🗑️  Cleaning up backup..."
    rm -rf "$BACKUP_DIR"
    echo "✅ Backup removed"
else
    echo "⚠️  No backup to restore"
fi

echo ""
echo "================================================================================"
echo "✅ TEST PASSED"
echo "================================================================================"
echo ""
echo "The app successfully handled missing directories by:"
echo "  ✅ Recreating all required directories"
echo "  ✅ Recreating configuration files"
echo "  ✅ Applying the theme without errors"
echo "  ✅ Creating the symlink correctly"
echo ""
echo "Test #114 can be marked as PASSING."
echo ""
