# Test Backup & Restore Preferences Functionality

## Test 1: Backup Preferences

### Steps:
1. Open the MacTheme app (should already be running)
2. Navigate to Settings view
3. Scroll to "Backup & Restore" section
4. Click "Backup..." button
5. Save dialog should appear
6. Choose save location (e.g., ~/Downloads/test-backup.json)
7. Click Save
8. Verify success message appears with file path
9. Open the backup file and verify it contains preferences

### Expected Behavior:
- Save dialog opens with default path ~/Downloads/mactheme-preferences-backup.json
- Backup file is created at selected location
- Success alert shows the file path
- Backup file contains:
  - version: "1.0"
  - timestamp: ISO date string
  - preferences: object with all preference fields

## Test 2: Restore Preferences

### Steps:
1. Note current preferences (e.g., theme choices, settings)
2. Modify some settings in the UI (e.g., toggle "Start at Login", change default themes)
3. Navigate to Settings > Backup & Restore
4. Click "Restore..." button
5. Select the backup file created in Test 1
6. Confirm the restore operation in the dialog
7. Verify success message appears
8. Verify settings return to backed-up state

### Expected Behavior:
- Confirmation dialog appears before restore
- Open dialog shows file picker
- After restore, settings UI updates to show backed-up values
- No errors in console
- Success alert appears

## Verification Checklist:

### Backup:
- [ ] Backup button is visible in Settings
- [ ] Clicking Backup opens save dialog
- [ ] Default filename is "mactheme-preferences-backup.json"
- [ ] Backup file is created successfully
- [ ] Backup file has correct structure (version, timestamp, preferences)
- [ ] Success message shows file path

### Restore:
- [ ] Restore button is visible in Settings
- [ ] Clicking Restore shows confirmation dialog
- [ ] After confirming, file picker opens
- [ ] Selecting backup file restores preferences
- [ ] Settings UI updates automatically after restore
- [ ] Success message appears
- [ ] No console errors

### Error Handling:
- [ ] Cancelling backup dialog doesn't show error
- [ ] Cancelling restore dialog doesn't show error
- [ ] Invalid backup file shows appropriate error message
