/**
 * Single source for the session-signing secret. Edge-safe (no Node imports).
 *
 * Production refuses to start without JWT_SECRET: a built-in fallback would let
 * anyone forge session cookies. The development fallback exists only so
 * `npm install && npm run dev` works with zero configuration.
 */
const DEV_ONLY_SECRET = "remitx-dev-only-secret-never-use-in-production-0000";

export function getJwtSecret(): string {
  const configured = process.env.JWT_SECRET;
  if (configured && configured.length >= 32) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET must be set to a random string of at least 32 characters in production."
    );
  }
  return DEV_ONLY_SECRET;
}
