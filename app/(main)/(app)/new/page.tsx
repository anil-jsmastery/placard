import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db, users } from "@/lib/db";
import { isUseCase } from "@/lib/examples";
import { getAiUsage } from "@/lib/usage";
import { PromptForm } from "./prompt-form";

// The prompt box (new.html). Yellow buttons spend an AI request.
export default async function NewSitePage() {
  const { userId } = await auth();
  const [row, usage] = userId
    ? await Promise.all([
        db.query.users.findFirst({ where: eq(users.id, userId), columns: { useCase: true } }),
        getAiUsage(userId),
      ])
    : [undefined, null];
  const useCase = isUseCase(row?.useCase) ? row.useCase : "other";

  return (
    <main className="mx-auto max-w-2xl px-4 pt-12 pb-20 sm:px-6 sm:pt-16">
      <h1 className="font-display text-4xl font-bold sm:text-5xl">Describe your site</h1>
      <p className="mt-3 text-muted-foreground">
        A sentence or two is enough. Say what you do, who it’s for and the feel you want.
      </p>
      <PromptForm useCase={useCase} left={usage?.left ?? 0} allowance={usage?.allowance ?? 0} />
    </main>
  );
}
