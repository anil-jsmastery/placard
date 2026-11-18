import "server-only";
import { currentUser } from "@clerk/nextjs/server";
import { db, users } from "@/lib/db";

export { isSimulatedEmail } from "./simulated";

export async function upsertUser(id: string, email: string) {
  await db.insert(users).values({ id, email }).onConflictDoNothing();
}

// Creates the users row for the signed-in Clerk user if it's missing.
export async function ensureUser() {
  const user = await currentUser();
  if (!user) return null;
  const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? "";
  await upsertUser(user.id, email);
  return { id: user.id, email };
}
