/**
 * IPC Handlers
 *
 * This module has been refactored into smaller, domain-specific modules
 * located in the ./handlers/ directory:
 *
 * - themeHandlers.ts     - Theme CRUD, import/export, apply
 * - wallpaperHandlers.ts - Wallpaper listing, apply, management
 * - appHandlers.ts       - Application detection and setup
 * - preferencesHandlers.ts - User preferences management
 * - systemHandlers.ts    - System operations, appearance, scheduling
 * - stateHandlers.ts     - Application state persistence
 * - loggingHandlers.ts   - Log file operations
 *
 * This file re-exports the public API for backward compatibility.
 */

// Re-export everything from the handlers index
export {
  setupIpcHandlers,
  handleApplyTheme,
  handleAppearanceChange,
  startScheduler,
  stopScheduler,
  handleGetState,
} from './handlers';
