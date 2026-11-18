"use server";

import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db, users } from "@/lib/db";
import { isUseCase } from "@/lib/examples";
import type { UseCase } from "@/lib/analytics/events";
import { ensureUser } from "@/lib/users";

/** Saves the onboarding answer to `users.use_case` ("Skip for now" saves "other"). */
export async function saveUseCase(useCase: UseCase) {
  const { userId } = await auth();
  if (!userId) throw new Error("Not signed in");
  if (!isUseCase(useCase)) throw new Error("Unknown use case");
  await ensureUser(); // the webhook may not have created the row yet
  await db.update(users).set({ useCase }).where(eq(users.id, userId));
}
