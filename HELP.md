# MacTheme Help & Documentation

Welcome to MacTheme! This guide will help you get the most out of your unified macOS theming experience.

## Table of Contents

- [Getting Started](#getting-started)
- [Applying Themes](#applying-themes)
- [Theme Sorting & Filtering](#theme-sorting--filtering)
- [Creating Custom Themes](#creating-custom-themes)
- [Managing Applications](#managing-applications)
- [Wallpapers](#wallpapers)
- [Auto-Switching](#auto-switching)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Troubleshooting](#troubleshooting)

## Getting Started

MacTheme provides a unified way to theme multiple applications on macOS. When you apply a theme, it updates:
- Terminal emulators (Alacritty, Kitty, iTerm2, Warp, Hyper)
- Code editors (VS Code, Neovim, Sublime Text)
- CLI tools (bat, delta, starship, zsh-syntax-highlighting)
- Launchers (Raycast, Alfred)
- Desktop wallpaper

### First Launch

On first launch, MacTheme will:
1. Create its configuration directory at `~/Library/Application Support/MacTheme`
2. Install 11 bundled themes
3. Set Tokyo Night as the default theme
4. Create a symlink system for easy theme switching

## Applying Themes

### From the Themes View

1. Navigate to the **Themes** tab in the sidebar
2. Browse available themes in the grid view
3. Click the **Apply** button on any theme card
4. The theme will be applied immediately, and supported applications will update

### Using Quick Switcher

Press **Cmd+Shift+T** (or your custom shortcut) to open the Quick Switcher:
1. Type to search for themes
2. Use arrow keys to navigate
3. Press **Enter** to apply the selected theme
4. Press **Esc** to cancel

### From the Menu Bar

Click the MacTheme icon in your menu bar to:
- See the current theme
- Access recently used themes
- Toggle between your last two themes
- Open the main window

## Theme Sorting & Filtering

### Filtering

Use the filter chips at the top of the Themes view:
- **All**: Show all themes
- **Light**: Show only light themes
- **Dark**: Show only dark themes
- **Favorites**: Show only favorited themes

### Sorting

Use the sort dropdown to organize themes:
- **Default**: Original order (file system)
- **Name (A-Z)**: Alphabetical ascending
- **Name (Z-A)**: Alphabetical descending
- **Recently Used**: Most recently applied themes first

### Search

Type in the search bar to filter themes by name.

### Favorites

Click the ⭐ star icon on any theme card to mark it as a favorite.

## Creating Custom Themes

### Theme Editor

1. Navigate to the **Editor** tab
2. Choose a starting point:
   - Start from scratch
   - Duplicate an existing theme
   - Import colors from an image
3. Customize the color palette using the color pickers
4. Preview your theme in real-time
5. Save your custom theme

### Theme Structure

Each theme contains configuration files for all supported applications. When you create a custom theme, MacTheme generates all these files automatically from your color palette.

### Exporting & Importing

- **Export**: Share your custom themes as `.mactheme` files
- **Import**: Load themes from `.mactheme` files or URLs

## Managing Applications

### Application Setup

1. Navigate to the **Apps** tab
2. MacTheme will detect installed supported applications
3. For each app, you'll see:
   - Installation status (Installed / Not Found)
   - Integration status (Configured / Needs Setup)
4. Click **Setup** to configure an application

### Setup Process

MacTheme will guide you through adding import statements to your application config files. For example:

**Alacritty** (`~/.config/alacritty/alacritty.toml`):
```toml
import = ["~/Library/Application Support/MacTheme/current/theme/alacritty.toml"]
```

**Kitty** (`~/.config/kitty/kitty.conf`):
```
include ~/Library/Application Support/MacTheme/current/theme/kitty.conf
```

## Wallpapers

Many themes include matching wallpapers.

### Applying Wallpapers

1. Navigate to the **Wallpapers** tab
2. Browse wallpapers included with themes
3. Click on a wallpaper to apply it
4. Choose which displays to apply to (all or specific)

### Dynamic Wallpapers

Some themes support light/dark variants that automatically switch based on system appearance.

## Auto-Switching

### System Appearance

Enable auto-switching to match macOS appearance:

1. Go to **Settings** → **Auto-Switching**
2. Enable **Auto-switch themes based on system appearance**
3. Select your preferred light theme
4. Select your preferred dark theme

When you change macOS appearance (Light/Dark mode), MacTheme will automatically apply the corresponding theme.

### Scheduled Switching

Switch themes based on time of day:

1. Go to **Settings** → **Auto-Switching**
2. Select **Schedule** mode
3. Set your light theme time (e.g., 6:00 AM)
4. Set your dark theme time (e.g., 6:00 PM)

### Sunrise/Sunset

Let MacTheme switch based on your location's sunrise and sunset times:

1. Go to **Settings** → **Auto-Switching**
2. Select **Sunrise/Sunset** mode
3. MacTheme will automatically determine your location's times
4. Light theme applies at sunrise
5. Dark theme applies at sunset

## Keyboard Shortcuts

Default shortcuts (customizable in Settings):

- **Cmd+Shift+T**: Open Quick Switcher
- **Cmd+,**: Open Settings (planned)
- **Esc**: Close Quick Switcher or modals

## Troubleshooting

### Theme Not Applying to Application

**Problem**: Applied a theme but my terminal/editor didn't update.

**Solutions**:
1. Make sure you've set up the application (see Managing Applications)
2. Restart the application to reload its configuration
3. Check that the import statement is correct in your config file
4. Verify the symlink exists: `ls -la ~/Library/Application Support/MacTheme/current/theme`

### Symlink Missing

**Problem**: The current theme symlink is missing.

**Solution**: MacTheme should automatically recreate it on startup. If not:
1. Restart MacTheme
2. Apply any theme from the Themes view
3. Check logs in Console.app for errors

### Themes Not Loading

**Problem**: Theme grid shows "Failed to load themes."

**Solutions**:
1. Check that themes directory exists: `~/Library/Application Support/MacTheme/themes`
2. Verify permissions on the MacTheme directory
3. Restart the application
4. Check Console.app for error messages

### Application Not Detected

**Problem**: MacTheme says an application isn't installed, but it is.

**Solutions**:
1. MacTheme checks common installation paths
2. Some applications installed via non-standard methods may not be detected
3. You can still manually set up the application by adding the import statement

### Performance Issues

**Problem**: MacTheme is slow or unresponsive.

**Solutions**:
1. Check how many themes you have installed (50+ themes may slow things down)
2. Restart MacTheme
3. Check Console.app for errors or warnings
4. Ensure you have sufficient disk space

### Colors Look Wrong

**Problem**: Theme colors don't match the preview.

**Solutions**:
1. Some applications may need to be restarted to reload the theme
2. Check that your terminal supports true color (24-bit color)
3. Some terminals may have local overrides in their config files
4. Try applying a different theme and then switching back

### Wallpaper Not Changing

**Problem**: Wallpaper doesn't change when applying a theme.

**Solutions**:
1. Check System Preferences → Desktop & Screen Saver permissions
2. Grant MacTheme permission to change wallpaper if prompted
3. Some themes may not include wallpapers
4. Check that wallpaper files exist in the theme directory

## Getting Help

If you encounter issues not covered here:

1. Check the [GitHub Issues](https://github.com/yourusername/mactheme/issues)
2. Search for similar problems
3. Create a new issue with:
   - MacTheme version (see Settings → About)
   - macOS version
   - Description of the problem
   - Steps to reproduce
   - Any error messages from Console.app

## Tips & Tricks

### Favorite Your Most-Used Themes

Mark themes as favorites for quick access. Favorites appear at the top of the Quick Switcher.

### Use Recently Used Sorting

After trying different themes, sort by "Recently Used" to quickly find your favorites.

### Create Variants

Duplicate existing themes and modify just a few colors to create variations.

### Backup Your Themes

Export your custom themes regularly:
1. Go to Settings → Data
2. Click "Export All Themes"
3. Save the export file somewhere safe

### Quick Theme Toggle

Use the menu bar to quickly toggle between your last two themes.

### Keyboard-Driven Workflow

1. Press **Cmd+Shift+T** to open Quick Switcher
2. Type a few letters to search
3. Press **Enter** to apply
4. All without touching your mouse!

---

**Need More Help?** Visit the [MacTheme Documentation](https://github.com/yourusername/mactheme#readme) or open an issue on GitHub.
