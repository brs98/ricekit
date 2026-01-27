/**
 * Core module - shared business logic for Flowstate
 *
 * This module contains all the pure business logic that can be used
 * by both the Electron app and the CLI. It has no Electron dependencies.
 */

// Interfaces and types
export * from './interfaces';

// Path management
export * from './paths';

// Utilities
export * from './utils';

// Domain operations
export * as theme from './theme';
export * as state from './state';
export * as preferences from './preferences';
export * as wallpaper from './wallpaper';
export * as apps from './apps';
export * as plugins from './plugins';
