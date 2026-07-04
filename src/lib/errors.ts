/**
 * Application error hierarchy.
 *
 * Services throw these domain errors; the HTTP layer (see `apiResponse.ts`)
 * translates them into consistent JSON responses with the right status code.
 * This keeps business logic free of HTTP/framework concerns.
 */
export class HttpError extends Error {
  readonly statusCode: number;
  /** Machine-readable error code for clients/telemetry. */
  readonly code: string;
  /** Optional field-level details (e.g. validation errors). */
  readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class BadRequestError extends HttpError {
  constructor(message = "Bad request", details?: unknown) {
    super(400, "BAD_REQUEST", message, details);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = "Authentication required") {
    super(401, "UNAUTHORIZED", message);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = "You do not have permission to perform this action") {
    super(403, "FORBIDDEN", message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Resource not found") {
    super(404, "NOT_FOUND", message);
  }
}

export class ConflictError extends HttpError {
  constructor(message = "Conflict") {
    super(409, "CONFLICT", message);
  }
}

export class TooManyRequestsError extends HttpError {
  constructor(message = "Too many requests, please try again later") {
    super(429, "TOO_MANY_REQUESTS", message);
  }
}
