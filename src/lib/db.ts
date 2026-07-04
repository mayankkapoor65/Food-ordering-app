import mongoose from "mongoose";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";

/**
 * Cached Mongoose connection.
 *
 * Next.js hot-reloads modules in development and may invoke API routes in a
 * serverless-style manner; caching the connection on the global object prevents
 * exhausting the connection pool by reconnecting on every call.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// eslint-disable-next-line no-var
declare global {
  var _mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global._mongooseCache || {
  conn: null,
  promise: null,
};
global._mongooseCache = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(env.MONGODB_URI, { bufferCommands: false })
      .then((m) => {
        logger.info("MongoDB connected");
        return m;
      })
      .catch((err) => {
        logger.error("MongoDB connection failed", { message: err.message });
        cached.promise = null; // allow retry on next call
        throw err;
      });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
