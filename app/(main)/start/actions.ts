"use server";

import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, users } from "@/lib/db";

const UseCase = z.enum(["designer", "developer", "photographer", "artist", "writer", "other"]);

// "What do you do?": stores users.use_case. The browser sends onboarding_completed after it.
export async function saveUseCase(useCase: string) {
  const { userId } = await auth.protect();
  const parsed = UseCase.parse(useCase);
  await db.update(users).set({ useCase: parsed }).where(eq(users.id, userId));
}
