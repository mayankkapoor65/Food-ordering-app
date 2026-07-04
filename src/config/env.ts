import { z } from "zod";

/**
 * Centralised, validated application configuration.
 *
 * Every environment variable the app reads is declared here once, with a type,
 * a sensible development default and validation. Reading `process.env` directly
 * anywhere else in the codebase is discouraged — import `env` from this module
 * so configuration stays typed and discoverable.
 */
const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  MONGODB_URI: z
    .string()
    .min(1)
    .default("mongodb://localhost:27017/food-ordering-db"),
  JWT_SECRET: z.string().min(1).default("dev-only-secret-change-me"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(10),
  /** Max login attempts allowed per window before throttling. */
  LOGIN_RATE_LIMIT: z.coerce.number().int().min(1).default(10),
  /** Login rate-limit window, in seconds. */
  LOGIN_RATE_WINDOW_SEC: z.coerce.number().int().min(1).default(60),
});

export type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);

  if (!parsed.success) {
    // Fail fast with a readable message rather than crashing deep in a request.
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  const env = parsed.data;

  // Guard against shipping insecure defaults to production.
  if (env.NODE_ENV === "production") {
    if (env.JWT_SECRET === "dev-only-secret-change-me") {
      throw new Error(
        "JWT_SECRET must be set to a strong value in production."
      );
    }
  }

  return env;
}

export const env = loadEnv();

export const isProd = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
