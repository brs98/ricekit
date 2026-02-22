# Contributing to Ricekit

Thanks for your interest in contributing! This guide covers the architecture and common contribution patterns.

## Development Setup

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Type check
npx tsc --noEmit

# Run tests
npm run test:run

# CLI development
npm run build && node dist/cli/index.js
```

## Architecture Overview

Ricekit follows a layered architecture:

```
src/
  core/         # Pure business logic (no Electron deps)
    apps/       # App detection, setup, adapters
    theme/      # Theme operations (list, apply)
    utils/      # FS utilities, helpers
  cli/          # CLI entry point and commands
  main/         # Electron main process (IPC handlers, window management)
  renderer/     # Electron renderer (React UI)
  shared/       # Types, constants, utilities shared across layers
```

**Key rule:** `core/` must never import from `main/` or `renderer/`. It uses Node.js built-ins and `core/utils/fs` for file operations.

## How to Add a New Integrated App

Adding support for a new app (with detection, setup, notification, and theme config generation) requires **one file**.

### 1. Create the Adapter

Create `src/core/apps/adapters/<appname>.ts`:

```typescript
import path from 'path';
import os from 'os';
import type { AppAdapter } from '../adapter';
import type { ThemeColors } from '../../../shared/types';
import { APP_CONFIG } from '../../../shared/constants';
import { registerAdapter } from '../registry';

const homeDir = os.homedir();

export const myAppAdapter: AppAdapter = {
  // === Required: Identity ===
  name: 'myapp',                          // lowercase identifier
  displayName: 'MyApp',                   // shown in UI
  category: 'terminal',                   // 'terminal' | 'editor' | 'system' | 'tiling'

  // === Required: Detection ===
  installPaths: [                         // checked with existsSync()
    '/Applications/MyApp.app',
    '/opt/homebrew/bin/myapp',
  ],
  configPath: path.join(homeDir, '.config', 'myapp', 'config.lua'),

  // === Optional: Multi-location config ===
  // configPaths: [                       // first existing path wins
  //   path.join(homeDir, '.myapp.lua'),
  //   path.join(homeDir, '.config', 'myapp', 'config.lua'),
  // ],

  // === Optional: Setup ===
  templateFile: 'myapp-config.lua',       // filename in src/templates/

  snippet: {
    code: `-- Ricekit integration
dofile("~/Library/Application Support/${APP_CONFIG.dataDirName}/current/theme/myapp.lua")`,
    instructions: 'Add this to your config file:',
  },

  // === Optional: Notification ===
  async notify(themePath, onLog) {
    // Reload the app when a theme is applied
    // Return true if successful, false otherwise
    onLog?.('✓ MyApp theme applied');
    return true;
  },

  // === Optional: Theme Config Generation ===
  generateThemeConfig(colors: ThemeColors) {
    return {
      fileName: 'myapp.lua',
      content: `-- MyApp colors\nbackground = "${colors.background}"\n`,
    };
  },
};

registerAdapter(myAppAdapter);
```

### 2. Register the Adapter

Add the import to `src/core/apps/adapters/index.ts`:

```typescript
import './myapp';
```

### 3. Add a Template (if setup creates configs)

If your adapter has `templateFile`, create `src/templates/<filename>` with a working starter config that includes the Ricekit integration snippet.

### 4. Test

```bash
# Type check
npx tsc --noEmit

# Run adapter tests
npm run test:run

# Smoke test CLI
node dist/cli/index.js apps list
node dist/cli/index.js apps supported
```

### AppAdapter Interface Reference

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Lowercase identifier (e.g., `'wezterm'`) |
| `displayName` | Yes | UI display name (e.g., `'WezTerm'`) |
| `category` | Yes | `'terminal'` \| `'editor'` \| `'system'` \| `'tiling'` |
| `installPaths` | Yes | Paths to check for installation |
| `configPath` | Yes | Default config path (used for setup creation) |
| `configPaths` | No | Priority list for finding existing config |
| `templateFile` | No | Template filename in `src/templates/` |
| `snippet` | No | Integration snippet for clipboard workflow |
| `checkIntegration()` | No | Override default config-file-read detection |
| `notify()` | No | Reload/refresh the app on theme change |
| `generateThemeConfig()` | No | Generate a theme config file for this app |

## How to Add a Theme Config Generator

For apps that only need a theme config file (no detection/setup/notification), add a standalone generator to `src/main/themeInstaller.ts`:

1. Add a `generateMyAppConfig(colors: ThemeColors): string` function
2. Add the `writeFile` call to `generateThemeConfigFiles()`
3. Add the same call to each `createXxxTheme()` function

## Existing Adapters as Examples

| Adapter | Features | Good Example Of |
|---------|----------|-----------------|
| `wezterm.ts` | Full adapter | File copy + config touch notification |
| `neovim.ts` | checkIntegration override | Directory-based config detection |
| `sketchybar.ts` | Full adapter | Process detection + CLI reload |
| `aerospace.ts` | configPaths | Multi-location config, shell script execution |

## Code Style

- TypeScript strict mode
- No `any` types (use `unknown` and narrow)
- Prefer `const` and `readonly`
- Use `core/utils/fs` for file operations in `core/`
- Use `main/utils/asyncFs` for file operations in `main/`
