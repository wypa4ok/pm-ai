/**
 * Simple structured logger for production debugging
 * Logs errors with context to help trace issues
 */

type LogLevel = "info" | "warn" | "error";

interface LogContext {
  userId?: string;
  endpoint?: string;
  action?: string;
  [key: string]: unknown;
}

function log(level: LogLevel, message: string, context?: LogContext, error?: unknown) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level: level.toUpperCase(),
    message,
    ...context,
  };

  if (error) {
    logEntry.error = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    };
  }

  const logString = JSON.stringify(logEntry);

  switch (level) {
    case "error":
      console.error(`[ERROR] ${logString}`);
      break;
    case "warn":
      console.warn(`[WARN] ${logString}`);
      break;
    case "info":
    default:
      console.log(`[INFO] ${logString}`);
      break;
  }
}

export const logger = {
  info: (message: string, context?: LogContext) => log("info", message, context),
  warn: (message: string, context?: LogContext) => log("warn", message, context),
  error: (message: string, context?: LogContext, error?: unknown) =>
    log("error", message, context, error),
};
