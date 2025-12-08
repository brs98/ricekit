# MacTheme - Unified macOS Theming System

<div align="center">

🎨 A beautiful Electron desktop application for unified theming across multiple macOS applications

**[Features](#features) • [Installation](#installation) • [Development](#development) • [Architecture](#architecture) • [Contributing](#contributing)**

</div>

---

## Overview

MacTheme is inspired by Omarchy's Linux theming system and brings unified theme management to macOS. Using a symlink-based architecture, MacTheme allows you to switch themes across all your favorite applications with a single click.

### Key Features

- 🎨 **11+ Built-in Themes** - Tokyo Night, Catppuccin, Gruvbox, Nord, Dracula, and more
- 🖼️ **Wallpaper Management** - Automatic wallpaper switching with theme changes
- ✨ **Custom Theme Creator** - Build your own themes with a beautiful color picker
- ⚡ **Quick Switcher** - Global keyboard shortcut for instant theme switching
- 🌓 **Auto-Switching** - Match system appearance, schedule, or sunrise/sunset
- 🔧 **20+ App Support** - Terminals, editors, CLI tools, and launchers
- 💎 **Native macOS UI** - SF Pro fonts, vibrancy effects, and native controls

### Supported Applications

#### Terminals
- Alacritty • Kitty • iTerm2 • Warp • Hyper • Terminal.app

#### Editors
- VS Code • Cursor • Neovim • Sublime Text

#### CLI Tools
- bat • delta • starship • zsh-syntax-highlighting • fzf • lazygit

#### Launchers
- Raycast • Alfred

#### System
- Desktop Wallpaper • macOS Accent Color • SketchyBar

#### Tiling Managers
- AeroSpace (with JankyBorders)

---

## Installation

### Prerequisites

- macOS 11.0 or later
- Node.js 18+ (for development)

### Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd mactheme

# Run setup script
./init.sh

# Start development
npm run dev
```

### Building from Source

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Package for distribution
npm run package
```

---

## Development

### Project Structure

```
mactheme/
├── src/
│   ├── main/           # Electron main process
│   │   ├── main.ts     # Application entry point
│   │   ├── ipc/        # IPC handlers
│   │   ├── theme/      # Theme management
│   │   └── utils/      # File system utilities
│   ├── renderer/       # React UI
│   │   ├── App.tsx     # Main React component
│   │   ├── views/      # Page components
│   │   ├── components/ # Reusable components
│   │   └── hooks/      # Custom React hooks
│   ├── preload/        # Preload script (context bridge)
│   └── shared/         # Shared types and constants
├── public/             # Static assets
├── themes/             # Bundled theme files
└── feature_list.json   # Test cases and development tracking
```

### Development Workflow

1. **Check feature_list.json** - Find the next feature to implement
2. **Implement the feature** - Write code following the architecture
3. **Test thoroughly** - Verify all test steps pass
4. **Update feature_list.json** - Mark feature as passing
5. **Commit your work** - Use descriptive commit messages

### Available Scripts

```bash
npm run dev      # Start development with hot reload
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
npm run format   # Format code with Prettier
npm test         # Run tests
```

### Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons
- **Backend**: Electron, Node.js, TypeScript
- **Storage**: JSON files for themes and preferences
- **IPC**: Electron IPC with context isolation
- **Build**: Vite + Electron Builder

---

## Architecture

### Theming System

MacTheme uses a symlink-based architecture for seamless theme switching:

```
~/Library/Application Support/MacTheme/
├── themes/              # Built-in themes
│   ├── tokyo-night/
│   ├── catppuccin-mocha/
│   └── ...
├── custom-themes/       # User-created themes
│   └── my-theme/
└── current/            # Active theme symlink
    └── theme -> ../themes/tokyo-night
```

### How It Works

1. **Application Configuration**: Each supported app imports from the `current/theme` symlink
2. **Theme Switching**: Changing themes updates the symlink to point to a different theme directory
3. **Automatic Reload**: Applications detect the config change and reload automatically

### Example Configuration

**Alacritty** (`~/.config/alacritty/alacritty.toml`):
```toml
import = ["~/Library/Application Support/MacTheme/current/theme/alacritty.toml"]
```

**Kitty** (`~/.config/kitty/kitty.conf`):
```
include ~/Library/Application Support/MacTheme/current/theme/kitty.conf
```

**Neovim** (`~/.config/nvim/lua/plugins/theme.lua`):
```lua
dofile(vim.fn.expand("~/Library/Application Support/MacTheme/current/theme/neovim.lua"))
```

### IPC Channels

The main process exposes these IPC channels:

- `theme:list` - Get all available themes
- `theme:apply` - Apply a theme
- `theme:create` - Create custom theme
- `wallpaper:apply` - Set desktop wallpaper
- `apps:detect` - Detect installed apps
- `preferences:get/set` - Manage preferences
- `system:appearance` - Get macOS appearance

---

## Feature Development

This project uses a comprehensive test-driven approach. The `feature_list.json` file contains 200+ test cases covering:

- ✅ **Functional Features** - Core functionality and user interactions
- 🎨 **Style Features** - UI/UX and visual design requirements

### Development Approach

1. **Never remove or edit features** in `feature_list.json`
2. **Only mark features as passing** when fully implemented and tested
3. **Work on features in priority order** - fundamental features first
4. **Test exhaustively** - all test steps must pass before marking complete
5. **Commit frequently** - save progress for future sessions

### For Future Agents

This is a **long-running autonomous project** across many sessions:

- Read `feature_list.json` to see what needs to be done
- Read `claude-progress.txt` to see what was completed
- Continue from where the previous agent left off
- Focus on quality - production-ready is the goal
- Update progress files before session ends

---

## Contributing

### Adding a New Theme

1. Create theme directory in `themes/`
2. Add `theme.json` with metadata and color palette
3. Generate config files for all supported applications
4. Add preview images
5. Test theme across multiple applications

### Adding Application Support

1. Add app detection logic in `src/main/apps/detect.ts`
2. Create config generator in `src/main/theme/generators/`
3. Add setup wizard instructions
4. Update documentation

### Code Style

- Use TypeScript for type safety
- Follow Airbnb style guide
- Use Prettier for formatting
- Write descriptive commit messages
- Add comments for complex logic

---

## Testing

### Manual Testing

Use the test steps in `feature_list.json` to verify functionality:

```bash
# Example: Testing theme switching
1. Launch application
2. Navigate to Themes view
3. Click Apply on Tokyo Night theme
4. Verify symlink points to tokyo-night
5. Check that theme.json is updated
6. Verify notification appears
```

### Automated Testing

```bash
npm test              # Run all tests
npm run test:unit     # Run unit tests
npm run test:e2e      # Run end-to-end tests
```

---

## Deployment

### Building for Distribution

```bash
# Build for current platform
npm run package

# Build for all platforms
npm run package:all

# Build for specific platform
npm run package:mac
npm run package:win
npm run package:linux
```

### Distribution Channels

- GitHub Releases
- Homebrew Cask
- Direct download from website

---

## Roadmap

See `feature_list.json` for the complete development roadmap. Major milestones:

- ✅ **Phase 1**: Project setup and architecture (Current)
- ⏳ **Phase 2**: Core theme system and symlink management
- ⏳ **Phase 3**: Theme browser UI
- ⏳ **Phase 4**: Application integration and detection
- ⏳ **Phase 5**: Theme editor and custom themes
- ⏳ **Phase 6**: Wallpaper manager
- ⏳ **Phase 7**: Menu bar and quick switcher
- ⏳ **Phase 8**: Auto-switching features
- ⏳ **Phase 9**: Polish and production release

---

## License

[License TBD]

---

## Acknowledgments

- Inspired by [Omarchy's Linux theming system](https://github.com/omakoto/omarchy)
- Theme designs from the amazing open-source community
- Built with Electron, React, and lots of ☕

---

## Support

- 📖 [Documentation](docs/)
- 🐛 [Issue Tracker](issues/)
- 💬 [Discussions](discussions/)

---

<div align="center">

Made with 💙 for the macOS theming community

**[⬆ Back to Top](#mactheme---unified-macos-theming-system)**

</div>
