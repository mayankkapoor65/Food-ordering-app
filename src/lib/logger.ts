import { env, isTest } from "@/config/env";

/**
 * Minimal structured logger.
 *
 * Emits single-line JSON in production (friendly for log aggregators) and
 * readable text in development. Deliberately dependency-free.
 */
type Level = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN_LEVEL: Level = env.NODE_ENV === "production" ? "info" : "debug";

function emit(level: Level, message: string, meta?: Record<string, unknown>) {
  if (isTest) return; // keep test output clean
  if (LEVEL_ORDER[level] < LEVEL_ORDER[MIN_LEVEL]) return;

  if (env.NODE_ENV === "production") {
    console[level === "debug" ? "log" : level](
      JSON.stringify({ level, time: new Date().toISOString(), message, ...meta })
    );
  } else {
    const tag = level.toUpperCase().padEnd(5);
    const rest = meta && Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    console[level === "debug" ? "log" : level](`${tag} ${message}${rest}`);
  }
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => emit("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => emit("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => emit("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => emit("error", msg, meta),
};
