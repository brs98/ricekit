import path from 'path';
import os from 'os';

/**
 * AeroSpace config search paths in priority order.
 * AeroSpace checks ~/.aerospace.toml first, then ~/.config/aerospace/aerospace.toml
 */
export const AEROSPACE_CONFIG_PATHS = [
  path.join(os.homedir(), '.aerospace.toml'),
  path.join(os.homedir(), '.config', 'aerospace', 'aerospace.toml'),
] as const;
