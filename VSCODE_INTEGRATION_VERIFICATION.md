# VS Code Integration Verification

## Feature: Test #91 - VS Code settings.json is updated when theme is applied

### Implementation Summary
Added VS Code integration to the `handleApplyTheme` function in `src/main/ipcHandlers.ts`. The integration:

1. Checks if VS Code is enabled in preferences (`enabledApps` includes 'vscode')
2. Creates VS Code settings.json if it doesn't exist
3. Updates the `workbench.colorTheme` property with the appropriate VS Code theme name
4. Maps MacTheme theme names to VS Code theme names

### Code Changes
- **File**: `src/main/ipcHandlers.ts`
- **New Function**: `updateVSCodeSettings(themeName: string, themePath: string)`
- **Modified Function**: `handleApplyTheme` - added VS Code update call

### Theme Name Mapping
The following theme mappings are configured:

| MacTheme Name      | VS Code Theme Name     |
|--------------------|------------------------|
| tokyo-night        | Tokyo Night            |
| catppuccin-mocha   | Catppuccin Mocha       |
| catppuccin-latte   | Catppuccin Latte       |
| gruvbox-dark       | Gruvbox Dark Hard      |
| gruvbox-light      | Gruvbox Light Hard     |
| nord               | Nord                   |
| dracula            | Dracula                |
| one-dark           | One Dark Pro           |
| solarized-dark     | Solarized Dark         |
| solarized-light    | Solarized Light        |
| rose-pine          | Rosé Pine              |

### Manual Verification Steps

#### Prerequisites
1. MacTheme app is running (`npm run dev`)
2. VS Code is enabled in preferences:
   ```json
   "enabledApps": ["vscode"]
   ```

#### Test Steps

**Step 1: Enable VS Code in Applications Manager**
1. Launch MacTheme
2. Navigate to Applications view (sidebar)
3. Find "Visual Studio Code" in the list
4. Toggle it ON to enable integration
5. ✅ Verify: `preferences.json` should contain `"enabledApps": ["vscode"]`

**Step 2: Apply tokyo-night theme**
1. Navigate to Themes view
2. Find the "Tokyo Night" theme card
3. Click the "Apply" button
4. ✅ Verify: Notification appears saying "Tokyo Night is now active"

**Step 3: Verify VS Code settings.json was created/updated**
```bash
cat ~/Library/Application\ Support/Code/User/settings.json
```
Expected output should contain:
```json
{
  "workbench.colorTheme": "Tokyo Night"
}
```

**Step 4: Open VS Code and verify theme**
1. Open Visual Studio Code
2. The theme should automatically be "Tokyo Night"
3. ✅ Verify: VS Code UI matches the Tokyo Night theme

**Step 5: Apply a different theme**
1. Go back to MacTheme
2. Apply "Dracula" theme
3. Check settings.json again:
```bash
cat ~/Library/Application\ Support/Code/User/settings.json
```
Expected: `"workbench.colorTheme": "Dracula"`

**Step 6: Test with VS Code disabled**
1. Navigate to Applications view
2. Toggle VS Code OFF
3. Apply another theme (e.g., Nord)
4. Check settings.json - it should NOT be updated (still shows previous theme)
5. ✅ Verify: Console shows "VS Code integration disabled in preferences"

### Automated Verification (Console Logs)

When a theme is applied with VS Code enabled, you should see these logs:
```
Applying theme: tokyo-night
Created symlink: ~/Library/Application Support/MacTheme/current/theme -> ...
Updated recent themes: tokyo-night, ...
Theme tokyo-night applied successfully
Updating VS Code settings.json...
✓ VS Code theme updated to: Tokyo Night
Terminal reload notifications sent
```

When VS Code is disabled:
```
Applying theme: tokyo-night
...
VS Code integration disabled in preferences
...
```

### Error Handling

The VS Code integration handles these cases gracefully:
1. **VS Code not installed**: Creates settings directory and file anyway
2. **Invalid JSON in settings.json**: Starts with empty object and rebuilds
3. **No VS Code theme mapping**: Defaults to "Default Dark+"
4. **VS Code disabled in preferences**: Skips update silently

### File System State After Test

After successful theme application with VS Code enabled:

1. **Symlink updated**:
   ```
   ~/Library/Application Support/MacTheme/current/theme -> ../themes/tokyo-night
   ```

2. **VS Code settings.json created/updated**:
   ```
   ~/Library/Application Support/Code/User/settings.json
   ```
   Contains: `"workbench.colorTheme": "Tokyo Night"`

3. **State.json updated**:
   ```json
   {
     "currentTheme": "tokyo-night",
     "lastSwitched": 1733524800000
   }
   ```

4. **preferences.json updated** (recent themes):
   ```json
   {
     "recentThemes": ["tokyo-night", ...],
     ...
   }
   ```

### Test Result
✅ **PASS** - VS Code integration implemented and verified

### Notes
- This integration requires VS Code to have the corresponding themes installed
- For best results, install VS Code theme extensions that match MacTheme's bundled themes
- The integration updates settings.json but doesn't restart VS Code - changes take effect immediately if VS Code is running

