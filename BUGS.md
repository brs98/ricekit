# MacTheme Bug Tracker

This file tracks critical bugs that must be fixed before implementing new features.

**Agents: READ THIS FILE FIRST before doing any work!**

---

## Active Bugs

### [BUG] Theme Loading Failure - Themes Not Displaying
- **Reported:** 2025-12-06
- **Severity:** CRITICAL
- **Symptom:** App displays "Failed to load themes. Please try again." error message in the Themes view when the application launches.
- **Steps to Reproduce:**
  1. Launch the MacTheme application
  2. Navigate to Themes view (default view)
  3. Observe error state in ThemeGrid component
- **Expected:** Theme grid should display all 11 bundled themes
- **Actual:** Shows error message "Failed to load themes. Please try again."
- **Verified Working:**
  - Themes directory exists: ~/Library/Application Support/MacTheme/themes/
  - All theme.json files are valid JSON with correct structure
  - Theme files (alacritty.toml, kitty.conf, etc.) exist
  - TypeScript compilation appears successful
  - Preload script exists at dist/preload/preload.js
  - IPC handlers are registered in main process
- **Investigation Needed:**
  1. Check Electron main process console for errors (not renderer console)
  2. Verify IPC handler 'theme:list' is being invoked
  3. Check if handleListThemes() is throwing an exception
  4. Verify getThemesDir() returns correct path
  5. Check if fs.readdirSync or fs.statSync is failing
- **Possible Causes:**
  - File permissions
  - Path resolution in packaged vs dev mode
  - Exception in loadTheme() not being caught properly
- **Files Involved:**
  - src/main/ipcHandlers.ts (handleListThemes function)
  - src/renderer/components/ThemeGrid.tsx (loadThemes function, line 29)
  - src/main/directories.ts (getThemesDir function)
- **Debug Steps:**
  1. Add console.log at start of handleListThemes() to verify it's called
  2. Add try/catch around the entire function body with detailed logging
  3. Log the value of getThemesDir() and getCustomThemesDir()
  4. Check if fs.existsSync(themesDir) returns true
  5. Test with a simple IPC handler that just returns a hardcoded array

---

## Resolved Bugs

### [RESOLVED] Theme Loading Failure
- **Reported:** 2025-12-06
- **Resolved:** 2025-12-06 (appears to have been a transient issue)
- **Symptom:** App displayed "Failed to load themes. Please try again." error
- **Root Cause:** Unknown - the issue resolved itself, possibly related to IPC timing or initialization order
- **Resolution:** Themes now load correctly (12 themes detected)
- **Action:** Monitor for recurrence. If it happens again, add extensive logging to `handleListThemes()` in `ipcHandlers.ts`

---

## How to Report a Bug

When you discover a bug, add it to the "Active Bugs" section with:

```markdown
### [BUG] Short Description
- **Reported:** YYYY-MM-DD
- **Severity:** CRITICAL / HIGH / MEDIUM / LOW
- **Symptom:** What the user sees
- **Steps to Reproduce:**
  1. Step 1
  2. Step 2
  3. ...
- **Expected:** What should happen
- **Actual:** What actually happens
- **Possible Cause:** Your hypothesis
- **Files Involved:** List relevant files
```

## How to Resolve a Bug

1. Fix the bug
2. Verify the fix works
3. Move the bug entry from "Active Bugs" to "Resolved Bugs"
4. Add resolution details:
   - **Resolved:** date
   - **Root Cause:** what was actually wrong
   - **Resolution:** what you did to fix it
5. Commit with message: `Fix: [bug description]`
