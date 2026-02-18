<div align="center">

# Ricekit

🎨 A beautiful Electron desktop application for unified theming across multiple macOS applications

**[Features](#features) • [Installation](#installation) • [Development](#development) • [Architecture](#architecture)**

</div>

---

## Overview

Ricekit is inspired by Omarchy's Linux theming system and brings unified theme management to macOS. Using a symlink-based architecture, Ricekit allows you to switch themes across all your favorite applications with a single click.

### Key Features

- 🎨 **14 Built-in Themes** - Tokyo Night, Catppuccin, Gruvbox, Nord, Rose Pine, and more
- 🖼️ **Wallpaper Management** - Automatic wallpaper switching with theme changes
- ✨ **Custom Theme Creator** - Build your own themes with a beautiful color picker
- ⚡ **Quick Switcher** - Global keyboard shortcut for instant theme switching
- 🌓 **Auto-Switching** - Match system appearance, schedule, or sunrise/sunset
- 💎 **Native macOS UI** - SF Pro fonts, vibrancy effects, and native controls

### Supported Applications

#### Terminals
- WezTerm

#### Editors
- Neovim

#### System
- Desktop Wallpaper • macOS Accent Color • SketchyBar

#### Tiling Managers
- AeroSpace

### Available Themes

**14 built-in themes:**
- Catppuccin (Mocha & Latte)
- Ethereal
- Everforest
- Flexoki Light
- Gruvbox
- Hackerman
- Kanagawa
- Matte Black
- Nord
- Osaka Jade
- Ristretto
- Rose Pine
- Tokyo Night

---

## Installation

### Prerequisites

- macOS 11.0 or later
- Node.js 18+ (for building from source)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/brs98/ricekit.git
cd ricekit

# Install dependencies
npm install

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
ricekit/
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
│   ├── shared/         # Shared types and constants
│   ├── core/           # Core app detection and theme logic
│   └── templates/      # App configuration templates
├── bundled-themes/     # Built-in theme files
├── bundled-presets/    # Theme presets (AeroSpace configs)
└── public/             # Static assets
```

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

Ricekit uses a symlink-based architecture for seamless theme switching:

```
~/Library/Application Support/Ricekit/
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

**WezTerm** (`~/.wezterm.lua`):

```lua
dofile(os.getenv("HOME") .. "/Library/Application Support/Ricekit/current/theme/wezterm.lua")
```

**Neovim** (`~/.config/nvim/init.lua`):

```lua
dofile(vim.fn.expand("~/Library/Application Support/Ricekit/current/theme/neovim.lua"))
```

**SketchyBar** (`~/.config/sketchybar/sketchybarrc`):

```bash
source "$HOME/Library/Application Support/Ricekit/current/theme/sketchybar.sh"
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

## Contributing

Ricekit is in active development! Contributions are welcome.

### Adding Support for New Applications

To add support for a new application:

1. Add the app definition to `src/core/apps/index.ts`
2. Create a template file in `src/templates/`
3. Add setup logic in `src/core/apps/setup.ts`

### Roadmap

Want to help? Here are some apps we'd love to support:

**Terminals:** Alacritty, Kitty, iTerm2, Warp, Hyper, Terminal.app  
**Editors:** VS Code, Cursor, Sublime Text, Zed  
**CLI Tools:** bat, delta, starship, fzf, lazygit, zsh-syntax-highlighting  
**Launchers:** Raycast, Alfred

---

## Testing

```bash
npm test              # Run all tests
npm run test:unit     # Run unit tests
npm run test:e2e      # Run end-to-end tests
```

---

## Building for Distribution

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

---

## License

MIT License - see [LICENSE](LICENSE) for details.

## Author

Created by [Brandon Smith](https://github.com/brs98)
