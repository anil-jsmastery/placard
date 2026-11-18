type PgErrorLike = { code?: unknown; constraint?: unknown };

function matches(e: unknown, constraint: string): boolean {
  if (!e || typeof e !== "object") return false;
  const pg = e as PgErrorLike;
  return pg.code === "23505" && pg.constraint === constraint;
}

// True when err is a Postgres unique violation on `constraint` (e.g. "sites_slug_key").
// Drizzle wraps driver errors, so look at err.cause first, then err itself.
export function isUniqueViolation(err: unknown, constraint: string): boolean {
  const cause = err && typeof err === "object" ? (err as { cause?: unknown }).cause : undefined;
  return matches(cause, constraint) || matches(err, constraint);
}
