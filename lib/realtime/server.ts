import "server-only";
import { createRealtime } from "@neon/realtime/server";
import { drizzleAdapter } from "@neon/realtime-drizzle";

// The one door to live data on the server. Realtime is on when both variables are set (`npx neon env pull -s realtime`);
// without them every page still works, with the numbers as of page load. The secret never leaves the server.
const url = process.env.NEON_REALTIME_URL;
const secret = process.env.NEON_REALTIME_SECRET;

export const realtime = url && secret ? createRealtime({ secret, db: "neondb", adapter: drizzleAdapter() }) : null;

// The WebSocket URL for the browser (public), or null when Realtime is off.
export function realtimeUrl(): string | null {
  return realtime ? url! : null;
}

type Sealable = Parameters<NonNullable<typeof realtime>["seal"]>[0]["query"];

let warned = false;

// The sealed query, or null when Realtime is off or sealing fails (logged once).
export async function sealOrNull<Q extends Sealable>(query: Q) {
  if (!realtime) return null;
  try {
    return await realtime.seal({ query });
  } catch (err) {
    if (!warned) {
      warned = true;
      console.error("realtime seal failed", err);
    }
    return null;
  }
}
