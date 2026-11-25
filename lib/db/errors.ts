type PgError = { code?: unknown; constraint?: unknown };

const isPgError = (e: unknown): e is PgError => typeof e === "object" && e !== null;

// True when Postgres rejected a write on this unique constraint (e.g. "sites_slug_key").
// Drizzle wraps the driver's error, so look at err.cause first, then err itself.
export function isUniqueViolation(err: unknown, constraint: string): boolean {
  const candidates = [isPgError(err) ? (err as { cause?: unknown }).cause : undefined, err];
  return candidates.some((e) => isPgError(e) && e.code === "23505" && e.constraint === constraint);
}
