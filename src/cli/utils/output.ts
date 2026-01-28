/**
 * CLI output utilities
 */

import chalk from 'chalk';
import type { OutputFormat } from '../../shared/constants';

/**
 * Global output format setting
 */
let outputFormat: OutputFormat = 'human';

/**
 * Set the output format
 */
export function setOutputFormat(format: OutputFormat): void {
  outputFormat = format;
}

/**
 * Get the current output format
 */
export function getOutputFormat(): OutputFormat {
  return outputFormat;
}

/**
 * Check if JSON output mode
 */
export function isJsonMode(): boolean {
  return outputFormat === 'json';
}

/**
 * Output data - JSON or human-readable
 */
export function output(data: unknown): void {
  if (isJsonMode()) {
    console.log(JSON.stringify(data, null, 2));
  } else if (typeof data === 'string') {
    console.log(data);
  } else {
    console.log(data);
  }
}

/**
 * Output success message (human mode only)
 */
export function success(message: string): void {
  if (!isJsonMode()) {
    console.log(chalk.green('✔'), message);
  }
}

/**
 * Output error message
 */
export function error(message: string, details?: string): void {
  if (isJsonMode()) {
    console.log(JSON.stringify({ success: false, error: message, details }, null, 2));
  } else {
    console.error(chalk.red('✖'), message);
    if (details) {
      console.error(chalk.gray(`  ${details}`));
    }
  }
}

/**
 * Output a table (human mode)
 */
export function table(
  headers: string[],
  rows: string[][],
  options?: { indent?: number }
): void {
  if (isJsonMode()) return;

  const indent = ' '.repeat(options?.indent ?? 0);

  // Calculate column widths
  const widths = headers.map((h, i) => {
    const maxRow = Math.max(...rows.map((r) => (r[i] || '').length));
    return Math.max(h.length, maxRow);
  });

  // Print header
  const headerLine = headers.map((h, i) => h.padEnd(widths[i] ?? 0)).join('  ');
  console.log(indent + chalk.bold(headerLine));
  console.log(indent + chalk.gray('─'.repeat(headerLine.length)));

  // Print rows
  for (const row of rows) {
    const line = row.map((cell, i) => (cell || '').padEnd(widths[i] ?? 0)).join('  ');
    console.log(indent + line);
  }
}

/**
 * Format a theme name with indicators
 */
export function formatThemeName(
  name: string,
  options?: { isCurrent?: boolean; isCustom?: boolean; isLight?: boolean }
): string {
  let formatted = name;

  if (options?.isCurrent) {
    formatted = chalk.green(formatted) + chalk.gray(' (current)');
  }

  if (options?.isCustom) {
    formatted += chalk.cyan(' ★');
  }

  if (options?.isLight) {
    formatted += chalk.yellow(' ☀');
  }

  return formatted;
}
