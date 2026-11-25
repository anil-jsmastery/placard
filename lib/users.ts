import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { captureServer } from "@/lib/analytics/server";
import { db, sites, users } from "@/lib/db";

// Clerk test users (and the swarm's) have "+clerk_test" in their email.
export const isSimulatedEmail = (email: string) => email.includes("+clerk_test");

// Creates the users row on a user's first signed-in page and sends signed_up, once per user per database.
export async function ensureUser() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? "";
  const created = await db.insert(users).values({ id: user.id, email }).onConflictDoNothing().returning({ id: users.id });
  if (created.length > 0) await captureServer(user.id, "signed_up", {});
  return { id: user.id, email };
}

// PostHog person properties the browser sends with identify(): use_case and sites_count.
export async function getPersonProps() {
  const { userId } = await auth();
  if (!userId) return null;
  const [row] = await db.select({ useCase: users.useCase }).from(users).where(eq(users.id, userId)).limit(1);
  const sitesCount = await db.$count(sites, eq(sites.userId, userId));
  return { use_case: row?.useCase ?? null, sites_count: sitesCount };
}
