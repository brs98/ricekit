# Plugin Auto-Setup Design

## Overview

MacTheme currently themes apps that users have already installed and configured. This design adds the ability to auto-install plugins (starting with system/UI tools) and provide default configurations for new users, while respecting existing setups.

## Scope

**Phase 1 (this design):** System/UI tools
- SketchyBar (menu bar)
- AeroSpace + JankyBorders (tiling window manager + window borders)

**Future phases:** CLI tools, other apps as needed

## Architecture

### Two-Layer Model

MacTheme separates **configs** (structure/layout) from **themes** (colors):

```
┌─────────────────────────────────────────────────────────┐
│ Config Layer                                            │
│ • Defines what exists (bar items, window rules, etc.)   │
│ • User chooses: Preset (managed) or Custom (their own)  │
│ • Presets are symlinked, updatable by MacTheme          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Theme Layer                                             │
│ • Defines colors ($COLOR_BACKGROUND, $COLOR_ACCENT...)  │
│ • Applied via imports to ANY config above               │
│ • Switching themes doesn't affect config choice         │
└─────────────────────────────────────────────────────────┘
```

### File Structure

```
~/Library/Application Support/MacTheme/
├── presets/
│   ├── sketchybar/
│   │   ├── minimal/
│   │   │   └── sketchybarrc
│   │   ├── pro/
│   │   │   └── sketchybarrc
│   │   └── islands/
│   │       └── sketchybarrc
│   └── aerospace/
│       ├── minimal/
│       │   ├── aerospace.toml
│       │   └── borders.sh
│       └── productivity/
│           ├── aerospace.toml
│           └── borders.sh
├── current/
│   ├── theme/              # existing - symlink to active theme
│   └── presets/            # new - symlinks to active presets
│       ├── sketchybar → ../../presets/sketchybar/minimal/
│       └── aerospace → ../../presets/aerospace/minimal/
└── themes/                 # existing
```

### User Config Files

For SketchyBar (`~/.config/sketchybar/`):

```
sketchybarrc      # MacTheme-managed: imports preset + colors + overrides
overrides.sh      # User-owned: customizations that survive preset switches
```

The `sketchybarrc` contains:

```bash
# MacTheme-managed - do not edit
source "$HOME/Library/Application Support/MacTheme/current/presets/sketchybar/sketchybarrc"
source "$HOME/Library/Application Support/MacTheme/current/theme/sketchybar-colors.sh"
source "$HOME/.config/sketchybar/overrides.sh"
```

## Installation & Setup Flow

### For Users WITHOUT the App Installed

When user clicks "Set Up SketchyBar":

1. Show preset selection with static preview images
2. Display what will happen: install Homebrew (if needed), install app, apply preset
3. On confirmation, execute automated steps:
   - Check for Homebrew → install if missing (requires password)
   - Run `brew install sketchybar`
   - Create `~/.config/sketchybar/` if needed
   - Write `sketchybarrc` with imports
   - Create empty `overrides.sh` with helpful comments
   - Symlink selected preset in MacTheme's `current/presets/`
   - Start service: `brew services start sketchybar`
   - Mark app as enabled in preferences

### For Users WITH Existing Config

MacTheme auto-detects existing configs and defaults to "Custom" mode:

- Shows "Using your existing config" badge in UI
- Only adds color import line to their existing config
- Creates backup before any modification
- No preset selection unless they explicitly choose to switch

## UI Design

### Plugin Cards in Settings

Each plugin displays as a card showing what it offers:

```
┌─────────────────────────────────────────────────────────┐
│ SketchyBar                           [Not Installed]    │
│ ──────────────────────────────────────────────────────  │
│ Highly customizable menu bar replacement.               │
│ Shows workspaces, system stats, notifications.          │
│                                                         │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐                    │
│ │ preview │ │ preview │ │ preview │                    │
│ │ Minimal │ │ Pro     │ │ Islands │                    │
│ └─────────┘ └─────────┘ └─────────┘                    │
│ 3 presets available                                     │
│                                                         │
│                          [Set Up SketchyBar →]          │
└─────────────────────────────────────────────────────────┘
```

### Card States

| State | Badge | Actions |
|-------|-------|---------|
| Not installed | `[Not Installed]` | "Set Up X →" |
| Installed, not enabled | `[Installed]` | "Enable" |
| Enabled with preset | `[Enabled]` + preset name | "Change", "Configure", "Disable" |
| Enabled with Custom | `[Enabled]` + "Custom" | "Try a Preset", "Configure", "Disable" |

### Configure Panel

Opens when user clicks "Configure":
- Current preset (or Custom) selection
- Link to `overrides.sh` location
- "Reset to defaults" option
- "Switch to Custom" / "Try a Preset" toggle
- "Restore original config" (if backup exists)

## Data Model

### Extended Preferences

```typescript
interface Preferences {
  enabledApps: string[];               // existing
  hookScript?: string;                 // existing
  schedule?: ScheduleConfig;           // existing
  dynamicWallpaper?: WallpaperConfig;  // existing

  // NEW: Plugin configurations
  pluginConfigs: {
    [appName: string]: PluginConfig;
  };
}

interface PluginConfig {
  mode: 'preset' | 'custom';
  preset?: string;                     // e.g., "minimal", "pro", "islands"
  installedBy: 'mactheme' | 'user' | 'unknown';
  configBackupPath?: string;           // path to user's original config backup
}
```

### Example preferences.json

```json
{
  "enabledApps": ["sketchybar", "aerospace", "alacritty"],
  "pluginConfigs": {
    "sketchybar": {
      "mode": "preset",
      "preset": "pro",
      "installedBy": "mactheme"
    },
    "aerospace": {
      "mode": "custom",
      "installedBy": "user",
      "configBackupPath": "~/.config/aerospace/aerospace.toml.mactheme-backup"
    }
  }
}
```

### Why Track `installedBy`

- If MacTheme installed it → offer "Uninstall" option
- If user installed it → only manage config, never offer uninstall
- Helps with troubleshooting

## Error Handling

### Installation Failures

| Scenario | Handling |
|----------|----------|
| No internet | Error: "Internet required to install. Check connection and try again." |
| Homebrew install fails | Error with link to manual Homebrew install guide |
| `brew install` fails | Error with brew output, offer "Try again" or "Install manually" |
| Password prompt dismissed | Explain why password needed, offer retry |
| Disk full | Detect before install, show space requirements |

### Config Conflicts

| Scenario | Handling |
|----------|----------|
| Existing config has our import already | Skip adding, just update symlink |
| Existing config is malformed | Warn user, offer to backup and replace |
| User deletes overrides.sh | Recreate empty one on next preset switch |
| User deletes sketchybarrc | Recreate with imports on "Repair" action |

### Service Management

| Scenario | Handling |
|----------|----------|
| Service won't start | Show error with logs, offer retry |
| Service running but not responding | Offer "Restart" action |
| Multiple instances | Detect and warn, offer to kill duplicates |

### Uninstall Flow

For MacTheme-installed apps only:

```
"Remove SketchyBar?"
• Uninstall via Homebrew
• Remove config files (or keep?)
• [Keep Config Files] [Remove Everything]
```

## Design Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope | System/UI tools first | Highest visual impact, less likely to have existing configs |
| Config vs Colors | Separate layers | Orthogonal concerns, any theme works with any preset |
| Preset management | Symlink + overrides.sh | Matches existing theme architecture, allows updates |
| Existing users | Auto-detect → Custom | Respects user investment, no friction |
| Installation | Fully automatic | Minimal friction for new users |
| Homebrew | Auto-install if needed | Complete automation for newcomers |
| UI | Contextual plugin cards | Progressive disclosure, pick what you want |
| Previews | Static screenshots | Ship fast, add dynamic later |
