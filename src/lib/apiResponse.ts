import { NextResponse } from "next/server";
import { HttpError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * Standard API response envelope helpers.
 * Success: { success: true, data }
 * Failure: { success: false, error: { code, message, details? } }
 */
export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function created<T>(data: T) {
  return ok(data, 201);
}

export function fail(
  message: string,
  status = 400,
  code = "ERROR",
  details?: unknown
) {
  return NextResponse.json(
    { success: false, error: { code, message, ...(details ? { details } : {}) } },
    { status }
  );
}

/** Translate a thrown error into a consistent JSON response. */
export function handleError(err: unknown) {
  if (err instanceof HttpError) {
    // Client/domain errors are expected — log at debug, not error.
    logger.debug("Handled HttpError", { code: err.code, status: err.statusCode });
    return fail(err.message, err.statusCode, err.code, err.details);
  }
  logger.error("Unhandled error", {
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
  return fail("Internal server error", 500, "INTERNAL_ERROR");
}
