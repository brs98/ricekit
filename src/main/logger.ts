import fs from 'fs';
import path from 'path';
import { app } from 'electron';

export const LogLevel = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

class Logger {
  #logDir: string;
  #logFile: string;
  #debugEnabled: boolean = false;
  #maxLogSize: number = 5 * 1024 * 1024; // 5MB
  #maxLogFiles: number = 3;

  constructor() {
    // Create logs directory in app data
    const appDataPath = app.getPath('userData');
    this.#logDir = path.join(appDataPath, 'logs');
    this.#logFile = path.join(this.#logDir, 'flowstate.log');

    this.#ensureLogDirectory();
    this.#rotateLogsIfNeeded();
  }

  #ensureLogDirectory(): void {
    if (!fs.existsSync(this.#logDir)) {
      fs.mkdirSync(this.#logDir, { recursive: true });
    }
  }

  #rotateLogsIfNeeded(): void {
    try {
      if (!fs.existsSync(this.#logFile)) {
        return;
      }

      const stats = fs.statSync(this.#logFile);
      if (stats.size < this.#maxLogSize) {
        return;
      }

      // Rotate logs: flowstate.log -> flowstate.log.1 -> flowstate.log.2 -> ...
      // Delete oldest log if we exceed maxLogFiles
      const oldestLog = path.join(this.#logDir, `flowstate.log.${this.#maxLogFiles - 1}`);
      if (fs.existsSync(oldestLog)) {
        fs.unlinkSync(oldestLog);
      }

      // Shift existing logs
      for (let i = this.#maxLogFiles - 2; i >= 0; i--) {
        const currentLog = i === 0
          ? this.#logFile
          : path.join(this.#logDir, `flowstate.log.${i}`);
        const nextLog = path.join(this.#logDir, `flowstate.log.${i + 1}`);

        if (fs.existsSync(currentLog)) {
          fs.renameSync(currentLog, nextLog);
        }
      }
    } catch (error: unknown) {
      console.error('Failed to rotate logs:', error);
    }
  }

  #formatTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
  }

  #writeLog(level: LogLevel, message: string, data?: unknown): void {
    const timestamp = this.#formatTimestamp();
    let logMessage = `[${timestamp}] [${level}] ${message}`;

    if (data !== undefined) {
      try {
        logMessage += ` ${JSON.stringify(data, null, 2)}`;
      } catch {
        logMessage += ` [Unable to stringify data]`;
      }
    }

    logMessage += '\n';

    try {
      // Also write to console for development
      const consoleMessage = `[${level}] ${message}`;
      switch (level) {
        case LogLevel.ERROR:
          console.error(consoleMessage, data || '');
          break;
        case LogLevel.WARN:
          console.warn(consoleMessage, data || '');
          break;
        case LogLevel.INFO:
          console.info(consoleMessage, data || '');
          break;
        case LogLevel.DEBUG:
          if (this.#debugEnabled) {
            console.log(consoleMessage, data || '');
          }
          break;
      }

      // Write to log file
      fs.appendFileSync(this.#logFile, logMessage, 'utf8');

      // Check if we need to rotate after writing
      this.#rotateLogsIfNeeded();
    } catch (error: unknown) {
      console.error('Failed to write log:', error);
    }
  }

  public setDebugEnabled(enabled: boolean): void {
    this.#debugEnabled = enabled;
    this.info('Debug logging ' + (enabled ? 'enabled' : 'disabled'));
  }

  public isDebugEnabled(): boolean {
    return this.#debugEnabled;
  }

  public debug(message: string, data?: unknown): void {
    if (this.#debugEnabled) {
      this.#writeLog(LogLevel.DEBUG, message, data);
    }
  }

  public info(message: string, data?: unknown): void {
    this.#writeLog(LogLevel.INFO, message, data);
  }

  public warn(message: string, data?: unknown): void {
    this.#writeLog(LogLevel.WARN, message, data);
  }

  public error(message: string, error?: unknown): void {
    let errorData = error;

    // Format error objects properly
    if (error instanceof Error) {
      errorData = {
        message: error.message,
        stack: error.stack,
        name: error.name
      };
    }

    this.#writeLog(LogLevel.ERROR, message, errorData);
  }

  public getLogDirectory(): string {
    return this.#logDir;
  }

  public getLogFile(): string {
    return this.#logFile;
  }

  public clearLogs(): void {
    try {
      if (fs.existsSync(this.#logFile)) {
        fs.unlinkSync(this.#logFile);
      }

      for (let i = 1; i < this.#maxLogFiles; i++) {
        const logFile = path.join(this.#logDir, `flowstate.log.${i}`);
        if (fs.existsSync(logFile)) {
          fs.unlinkSync(logFile);
        }
      }

      this.info('Logs cleared');
    } catch (error: unknown) {
      console.error('Failed to clear logs:', error);
    }
  }
}

// Export singleton instance
export const logger = new Logger();
