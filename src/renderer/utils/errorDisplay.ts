/**
 * Error display utilities for the renderer process
 *
 * Parses structured errors from the main process and provides
 * user-friendly display information.
 */

import { parseError, isCancellation } from '../../shared/errors';

export interface ErrorDisplay {
  title: string;
  message: string;
  action?: string;
}

/**
 * Get user-friendly error display information from an error
 */
export function getErrorDisplay(error: unknown): ErrorDisplay {
  const { code, message } = parseError(error);

  switch (code) {
    case 'PERMISSION_ERROR':
      return {
        title: 'Permission Error',
        message,
        action: 'chmod -R u+w ~/Library/Application\\ Support/Flowstate',
      };

    case 'THEME_NOT_FOUND':
      return {
        title: 'Theme Not Found',
        message,
      };

    case 'THEME_EXISTS':
      return {
        title: 'Theme Already Exists',
        message,
      };

    case 'THEME_INVALID':
      return {
        title: 'Invalid Theme',
        message,
      };

    case 'THEME_ACTIVE':
      return {
        title: 'Theme In Use',
        message,
      };

    case 'FILE_EXISTS':
      return {
        title: 'File Conflict',
        message,
      };

    case 'FILE_NOT_FOUND':
      return {
        title: 'File Not Found',
        message,
      };

    case 'NO_SPACE':
      return {
        title: 'Disk Space Error',
        message,
      };

    case 'INVALID_ARCHIVE':
      return {
        title: 'Invalid Archive',
        message,
      };

    case 'INVALID_URL':
      return {
        title: 'Invalid URL',
        message,
      };

    case 'DOWNLOAD_FAILED':
      return {
        title: 'Download Failed',
        message,
      };

    case 'SYMLINK_ERROR':
      return {
        title: 'Theme Link Error',
        message,
      };

    case 'HOOK_ERROR':
      return {
        title: 'Hook Script Error',
        message,
      };

    case 'UNEXPECTED_ERROR':
    default:
      return {
        title: 'Error',
        message,
      };
  }
}

/**
 * Format error for display in an alert dialog
 */
export function formatErrorAlert(error: unknown): string {
  // Don't show alerts for user cancellations
  if (isCancellation(error)) {
    return '';
  }

  const display = getErrorDisplay(error);
  let alertMessage = `${display.title}\n\n${display.message}`;

  if (display.action) {
    alertMessage += `\n\nTry running: ${display.action}`;
  }

  return alertMessage;
}

/**
 * Show an error alert if it's not a cancellation
 * Returns true if alert was shown, false if suppressed
 */
export function showErrorAlert(error: unknown): boolean {
  const message = formatErrorAlert(error);
  if (message) {
    alert(message);
    return true;
  }
  return false;
}
