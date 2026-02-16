/**
 * Structured logger using Pino (high-performance logging)
 * Consistent with the worker app logging
 */

import { pino } from "pino";

// Create Pino logger instance
const pinoLogger = pino({
  name: "web",
  level: process.env.LOG_LEVEL ?? "info",
  // For development: pretty print
  transport:
    process.env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        }
      : undefined,
  // For production: JSON output
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
});

interface LogContext {
  userId?: string;
  endpoint?: string;
  action?: string;
  [key: string]: unknown;
}

export const logger = {
  info: (message: string, context?: LogContext) => {
    pinoLogger.info(context ?? {}, message);
  },

  warn: (message: string, context?: LogContext) => {
    pinoLogger.warn(context ?? {}, message);
  },

  error: (message: string, context?: LogContext, error?: unknown) => {
    const logData = {
      ...context,
      error: error instanceof Error
        ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
          }
        : error,
    };
    pinoLogger.error(logData, message);
  },

  // Direct access to Pino logger for advanced usage
  raw: pinoLogger,
};
