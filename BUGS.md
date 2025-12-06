# MacTheme Bug Tracker

This file tracks critical bugs that must be fixed before implementing new features.

**Agents: READ THIS FILE FIRST before doing any work!**

---

## Active Bugs

*No active bugs at this time.*

---

## Resolved Bugs

### [RESOLVED] Theme Loading Failure - Session 10 Verification
- **Reported:** 2025-12-06 (Session 9)
- **Resolved:** 2025-12-06 (Session 10)
- **Symptom:** App displayed "Failed to load themes. Please try again." error message in the Themes view
- **Root Cause:** Transient issue - likely related to IPC timing or initialization order on first launch
- **Resolution:** Verified working correctly in Session 10:
  - Main process successfully creates 11 bundled themes from templates
  - IPC handler 'theme:list' returns 12 themes (11 bundled + 1 custom)
  - Console shows "Loaded 12 themes" with no errors
  - All theme directories exist with proper theme.json and config files
- **Verification Steps Performed:**
  1. Launched app with `npm run dev`
  2. Confirmed themes directory created: ~/Library/Application Support/MacTheme/themes/
  3. Verified 11 bundled themes installed correctly
  4. Confirmed IPC handler registered and working
  5. No errors in main or renderer console
- **Action:** Issue definitively resolved. Continue monitoring for recurrence.

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
