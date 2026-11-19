import "server-only";
import { createRealtime, type SealedLiveQuery } from "@neon/realtime/server";
import { drizzleAdapter } from "@neon/realtime-drizzle";

// Neon Realtime on the server (Step 11): the one door to live data. Queries are sealed only here, after the
// same ownership and plan checks as the page that shows them. The secret never leaves the server.

const url = process.env.NEON_REALTIME_URL || null;
const secret = process.env.NEON_REALTIME_SECRET || null;

/** The sealer, or null when this branch has no Realtime (pages then show the numbers as of page load). */
export const realtime =
  url && secret ? createRealtime({ secret, db: "neondb", adapter: drizzleAdapter() }) : null;

type Sealable = Parameters<NonNullable<typeof realtime>["seal"]>[0]["query"];

/** The Realtime WebSocket URL for the browser (it's public), or null when Realtime is off. */
export function realtimeUrl() {
  return realtime ? url : null;
}

let warned = false;

/** Seals a live query, or null when Realtime is off or sealing fails (logged once). */
export async function sealOrNull<Query extends Sealable>(query: Query) {
  if (!realtime) return null;
  try {
    return await realtime.seal({ query });
  } catch (error) {
    if (!warned) {
      warned = true;
      console.warn(`Realtime: sealing a live query failed, pages fall back to the numbers as of page load: ${error}`);
    }
    return null;
  }
}

export type { SealedLiveQuery };
