import "server-only";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { captureServer } from "@/lib/analytics/server";
import { db, users } from "@/lib/db";

// Creates the users row on a user's first signed-in page and sends signed_up, once per user per database.
export async function ensureUser() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? "";
  const created = await db.insert(users).values({ id: user.id, email }).onConflictDoNothing().returning({ id: users.id });
  if (created.length > 0) {
    // The row is saved; an analytics failure must not keep the user out of the app.
    try {
      await captureServer(user.id, "signed_up", {});
    } catch (err) {
      console.error("signed_up capture failed", err);
    }
  }
  return { id: user.id, email };
}
