/**
 * CLI Notification service implementation
 */

import type { NotificationService } from '../../core/interfaces';
import chalk from 'chalk';

/**
 * Console-based notifications for CLI context
 */
export class CliNotificationService implements NotificationService {
  show(title: string, body: string): void {
    console.log(chalk.bold(title));
    console.log(body);
  }

  success(title: string, body: string): void {
    console.log(chalk.green('✔'), chalk.bold(title));
    console.log(chalk.green(`  ${body}`));
  }

  error(title: string, body: string): void {
    console.log(chalk.red('✖'), chalk.bold(title));
    console.log(chalk.red(`  ${body}`));
  }
}

/**
 * Silent notifications (for --quiet mode)
 */
export class SilentNotificationService implements NotificationService {
  show(): void {}
  success(): void {}
  error(): void {}
}

/**
 * Default CLI notification service instance
 */
export const notifications = new CliNotificationService();
