/**
 * App setup operations
 *
 * Configure applications for Ricekit integration.
 * - No config exists → Create minimal working config from template
 * - Config exists with Ricekit → Return 'already_setup'
 * - Config exists without Ricekit → Return snippet for clipboard
 */

import path from 'path';
import os from 'os';
import fs from 'fs';
import type { Result } from '../interfaces';
import { ok, err } from '../interfaces';
import {
  existsSync,
  readFile,
  writeFile,
  ensureDir,
} from '../utils/fs';
import { APP_CONFIG } from '../../shared/constants';
import { typedKeys } from '../../shared/types';
import { createErrorWithHint } from '../../shared/errors';
import { getSnippet, hasSnippet, type AppSnippet } from './snippets';
import { AEROSPACE_CONFIG_PATHS } from './constants';

const homeDir = os.homedir();

/**
 * Result of app setup operation
 */
export interface SetupResult {
  action: 'created' | 'clipboard' | 'already_setup';
  configPath?: string;
  snippet?: string;
  instructions?: string;
  message: string;
}

/**
 * Preview of what setup would do (without making changes)
 */
export interface SetupPreview {
  action: 'create' | 'modify' | 'already_setup';
  configPath: string;
  fileExists: boolean;
  hasExistingIntegration: boolean;
  /** For 'create' action - full template content */
  newContent?: string;
  /** For 'modify' action - snippet to add */
  snippet?: string;
  instructions?: string;
  /** Current file content (truncated for large files) */
  currentContent?: string;
  message: string;
}

/**
 * App configuration definitions
 */
const APP_CONFIGS = {
  neovim: {
    configPath: path.join(homeDir, '.config', 'nvim', 'init.lua'),
    templateFile: 'neovim-init.lua',
  },
  wezterm: {
    configPath: path.join(homeDir, '.config', 'wezterm', 'wezterm.lua'),
    templateFile: 'wezterm.lua',
  },
  sketchybar: {
    configPath: path.join(homeDir, '.config', 'sketchybar', 'sketchybarrc'),
    templateFile: 'sketchybarrc',
  },
  aerospace: {
    configPath: path.join(homeDir, '.config', 'aerospace', 'aerospace.toml'),
    templateFile: 'aerospace.toml',
  },
} as const satisfies Record<string, { readonly configPath: string; readonly templateFile: string }>;

type AppConfigKey = keyof typeof APP_CONFIGS;

/**
 * Resolve the effective config path for an app.
 * For aerospace, checks the priority path list and returns the first existing path,
 * falling back to the XDG default for new config creation.
 */
function resolveConfigPath(normalizedName: string, defaultPath: string): string {
  if (normalizedName === 'aerospace') {
    return AEROSPACE_CONFIG_PATHS.find((p) => existsSync(p)) ?? defaultPath;
  }
  return defaultPath;
}

/**
 * Detection patterns for Ricekit integration
 */
const RICEKIT_PATTERNS = [
  APP_CONFIG.dataDirName,  // 'Ricekit'
  'ricekit',
  'wezterm-colors.lua',
] as const;

/**
 * Check if content already has Ricekit integration
 */
export function hasRicekitIntegration(content: string): boolean {
  const lowerContent = content.toLowerCase();
  return RICEKIT_PATTERNS.some(pattern => lowerContent.includes(pattern.toLowerCase()));
}

/**
 * Get template content for an app
 * Templates are bundled in src/templates/ for development
 * and resources/templates/ for production builds
 */
export async function getTemplate(appName: string): Promise<string | null> {
  const config = APP_CONFIGS[appName.toLowerCase() as AppConfigKey];
  if (!config) return null;

  // Build list of paths to try
  // In CLI context, __dirname is dist/cli/core/apps
  // In main context, __dirname is dist/main/core/apps
  const templatePaths: string[] = [
    // Development CLI: dist/cli/core/apps -> src/templates (4 levels up + src/templates)
    path.join(__dirname, '..', '..', '..', '..', 'src', 'templates', config.templateFile),
    // Development: relative to dist (compiled output)
    path.join(__dirname, '..', '..', 'templates', config.templateFile),
  ];

  // Electron production: in app resources
  // process.resourcesPath only exists in Electron
  const resourcesPath = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath;
  if (resourcesPath) {
    templatePaths.unshift(path.join(resourcesPath, 'templates', config.templateFile));
  }

  for (const templatePath of templatePaths) {
    if (existsSync(templatePath)) {
      return readFile(templatePath);
    }
  }

  // Fallback: try sync read for bundled templates
  try {
    const fallbackPath = path.join(__dirname, '../../templates', config.templateFile);
    if (fs.existsSync(fallbackPath)) {
      return fs.readFileSync(fallbackPath, 'utf-8');
    }
  } catch {
    // Ignore errors
  }

  return null;
}

/**
 * Setup an application for theming
 *
 * Returns a SetupResult with the action taken:
 * - 'created': Created new config from template
 * - 'clipboard': Existing config, snippet ready for clipboard
 * - 'already_setup': Config already has Ricekit integration
 */
export async function setupApp(
  appName: string
): Promise<Result<SetupResult, Error>> {
  const normalizedName = appName.toLowerCase();

  // Check if app is supported
  const config = APP_CONFIGS[normalizedName as AppConfigKey];
  if (!config) {
    const supportedApps = typedKeys(APP_CONFIGS).join(', ');
    return err(createErrorWithHint(
      'UNEXPECTED_ERROR',
      `Unsupported app: ${appName}`,
      `Supported apps: ${supportedApps}. Run 'ricekit apps list' to see all options.`
    ));
  }

  const configPath = resolveConfigPath(normalizedName, config.configPath);

  // Check if config already exists
  if (existsSync(configPath)) {
    const content = await readFile(configPath);

    // Check if already has Ricekit integration
    if (hasRicekitIntegration(content)) {
      return ok({
        action: 'already_setup',
        configPath,
        message: `${appName} is already configured with Ricekit integration.`,
      });
    }

    // Config exists but no Ricekit - return snippet for clipboard
    const snippetInfo = getSnippet(normalizedName);
    if (snippetInfo) {
      return ok({
        action: 'clipboard',
        configPath,
        snippet: snippetInfo.snippet,
        instructions: snippetInfo.instructions,
        message: `${appName} config exists. Add the integration snippet to your config.`,
      });
    }

    // Fallback error if no snippet defined
    return err(new Error(`No integration snippet defined for ${appName}`));
  }

  // No config exists - create from template (always use XDG default path)
  const createPath = config.configPath;
  const createDir = path.dirname(createPath);
  const template = await getTemplate(normalizedName);
  if (!template) {
    return err(createErrorWithHint(
      'FILE_NOT_FOUND',
      `Template not found for ${appName}`,
      `Create the config manually at: ${createPath}`
    ));
  }

  // Ensure config directory exists
  if (!existsSync(createDir)) {
    await ensureDir(createDir);
  }

  // Write template to config path
  await writeFile(createPath, template);

  return ok({
    action: 'created',
    configPath: createPath,
    message: `Created ${appName} config at ${createPath}`,
  });
}

/**
 * Get list of apps that can be set up
 */
export function getSetupableApps(): AppConfigKey[] {
  return typedKeys(APP_CONFIGS);
}

/**
 * Get the config path for an app
 */
export function getAppConfigPath(appName: string): string | undefined {
  const config = APP_CONFIGS[appName.toLowerCase() as AppConfigKey];
  return config?.configPath;
}

/**
 * Check if an app supports clipboard snippet workflow
 */
export function supportsClipboardSetup(appName: string): boolean {
  return hasSnippet(appName);
}

/**
 * Preview what setup would do without making changes
 *
 * Returns information about what files would be created/modified,
 * allowing the UI to show the user exactly what will happen.
 */
export async function previewSetup(
  appName: string
): Promise<Result<SetupPreview, Error>> {
  const normalizedName = appName.toLowerCase();

  // Check if app is supported
  const config = APP_CONFIGS[normalizedName as AppConfigKey];
  if (!config) {
    const supportedApps = typedKeys(APP_CONFIGS).join(', ');
    return err(createErrorWithHint(
      'UNEXPECTED_ERROR',
      `Unsupported app: ${appName}`,
      `Supported apps: ${supportedApps}. Run 'ricekit apps list' to see all options.`
    ));
  }

  const configPath = resolveConfigPath(normalizedName, config.configPath);
  const fileExists = existsSync(configPath);

  // Check if config already exists
  if (fileExists) {
    const content = await readFile(configPath);
    const hasIntegration = hasRicekitIntegration(content);

    if (hasIntegration) {
      return ok({
        action: 'already_setup',
        configPath,
        fileExists: true,
        hasExistingIntegration: true,
        currentContent: truncateContent(content),
        message: `${appName} is already configured with Ricekit integration.`,
      });
    }

    // Config exists but no Ricekit - return snippet info
    const snippetInfo = getSnippet(normalizedName);
    if (snippetInfo) {
      return ok({
        action: 'modify',
        configPath,
        fileExists: true,
        hasExistingIntegration: false,
        snippet: snippetInfo.snippet,
        instructions: snippetInfo.instructions,
        currentContent: truncateContent(content),
        message: `${appName} config exists. The integration snippet will be added.`,
      });
    }

    // Fallback error if no snippet defined
    return err(new Error(`No integration snippet defined for ${appName}`));
  }

  // No config exists - would create from template (always use XDG default path)
  const createPath = config.configPath;
  const template = await getTemplate(normalizedName);
  if (!template) {
    return err(createErrorWithHint(
      'FILE_NOT_FOUND',
      `Template not found for ${appName}`,
      `Create the config manually at: ${createPath}`
    ));
  }

  return ok({
    action: 'create',
    configPath: createPath,
    fileExists: false,
    hasExistingIntegration: false,
    newContent: template,
    message: `A new ${appName} config file will be created.`,
  });
}

/**
 * Truncate content for preview display
 * Keeps first portion of file to avoid overwhelming UI
 */
function truncateContent(content: string, maxLines = 50): string {
  const lines = content.split('\n');
  if (lines.length <= maxLines) {
    return content;
  }
  return lines.slice(0, maxLines).join('\n') + `\n\n... (${lines.length - maxLines} more lines)`;
}

// Re-export snippet utilities
export { getSnippet, hasSnippet, type AppSnippet };
