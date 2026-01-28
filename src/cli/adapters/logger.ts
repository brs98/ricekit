/**
 * CLI Logger implementation
 */

import type { LoggerService } from '../../core/interfaces';
import chalk from 'chalk';

/**
 * Console logger for CLI context
 */
export class CliLogger implements LoggerService {
  #debugEnabled = false;

  debug(message: string, data?: unknown): void {
    if (this.#debugEnabled) {
      console.log(chalk.gray(`[DEBUG] ${message}`), data ?? '');
    }
  }

  info(message: string, data?: unknown): void {
    console.log(chalk.blue('ℹ'), message, data ?? '');
  }

  warn(message: string, data?: unknown): void {
    console.log(chalk.yellow('⚠'), message, data ?? '');
  }

  error(message: string, error?: unknown): void {
    console.error(chalk.red('✖'), message);
    if (error) {
      if (error instanceof Error) {
        console.error(chalk.red(`  ${error.message}`));
        if (this.#debugEnabled && error.stack) {
          console.error(chalk.gray(error.stack));
        }
      } else {
        console.error(chalk.red(`  ${String(error)}`));
      }
    }
  }

  setDebugEnabled(enabled: boolean): void {
    this.#debugEnabled = enabled;
  }

  isDebugEnabled(): boolean {
    return this.#debugEnabled;
  }
}

/**
 * Quiet logger that only outputs errors
 */
export class QuietLogger implements LoggerService {
  debug(): void {}
  info(): void {}
  warn(): void {}

  error(message: string, error?: unknown): void {
    console.error(message);
    if (error instanceof Error) {
      console.error(error.message);
    }
  }

  setDebugEnabled(): void {}
  isDebugEnabled(): boolean {
    return false;
  }
}

/**
 * Default CLI logger instance
 */
export const logger = new CliLogger();
