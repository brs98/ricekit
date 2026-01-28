/**
 * Centralized error codes and utilities for Flowstate
 *
 * All errors thrown in IPC handlers should use createError() to ensure
 * consistent formatting that the UI can parse and display appropriately.
 */

export const ErrorCodes = {
  // Theme operations
  THEME_NOT_FOUND: 'THEME_NOT_FOUND',
  THEME_EXISTS: 'THEME_EXISTS',
  THEME_INVALID: 'THEME_INVALID',
  THEME_ACTIVE: 'THEME_ACTIVE',

  // File operations
  PERMISSION_ERROR: 'PERMISSION_ERROR',
  FILE_EXISTS: 'FILE_EXISTS',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  NO_SPACE: 'NO_SPACE',

  // Import/Export
  IMPORT_CANCELED: 'IMPORT_CANCELED',
  EXPORT_CANCELED: 'EXPORT_CANCELED',
  INVALID_ARCHIVE: 'INVALID_ARCHIVE',
  INVALID_URL: 'INVALID_URL',
  DOWNLOAD_FAILED: 'DOWNLOAD_FAILED',

  // System
  SYMLINK_ERROR: 'SYMLINK_ERROR',
  HOOK_ERROR: 'HOOK_ERROR',
  UNEXPECTED_ERROR: 'UNEXPECTED_ERROR',
} as const;

export type ErrorCode = keyof typeof ErrorCodes;

/**
 * Create a structured error with a code prefix
 * Format: "ERROR_CODE: Human-readable message"
 *
 * @example
 * throw createError('THEME_NOT_FOUND', `Theme "${name}" not found`);
 */
export function createError(code: ErrorCode, message: string): Error {
  return new Error(`${code}: ${message}`);
}

/**
 * Parse a structured error message into code and message components
 * Returns UNEXPECTED_ERROR if the error doesn't match the expected format
 */
export function parseError(error: unknown): { code: string; message: string } {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const match = errorMessage.match(/^([A-Z_]+):\s*(.+)$/);

  if (match && match[1] && match[2]) {
    return { code: match[1], message: match[2] };
  }

  return { code: 'UNEXPECTED_ERROR', message: errorMessage };
}

/**
 * Check if an error matches a specific error code
 */
export function isErrorCode(error: unknown, code: ErrorCode): boolean {
  const { code: errorCode } = parseError(error);
  return errorCode === code;
}

/**
 * Check if an error is a user-initiated cancellation (not a real error)
 */
export function isCancellation(error: unknown): boolean {
  const { code } = parseError(error);
  return code === 'IMPORT_CANCELED' || code === 'EXPORT_CANCELED';
}

/**
 * Extract a loggable error message from an unknown error
 * Useful for catch blocks where the error type is unknown
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
