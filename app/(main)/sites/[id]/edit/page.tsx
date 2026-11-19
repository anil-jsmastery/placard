import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db, sites, users } from "@/lib/db";
import { isUseCase } from "@/lib/examples";
import { hasFeature } from "@/lib/plan";
import type { PageData } from "@/lib/site/types";
import { getLiveAiUsage } from "@/lib/usage";
import { realtimeUrl } from "@/lib/realtime/server";
import { AiUsageProvider } from "@/components/app/live-usage";
import { RealtimeRoot } from "@/components/realtime/realtime-root";
import { Editor } from "@/components/editor/editor";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditSitePage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  const { id } = await params;
  if (!userId || !UUID.test(id)) notFound();

  const site = await db.query.sites.findFirst({
    where: and(eq(sites.id, id), eq(sites.userId, userId)),
    columns: { id: true, name: true, slug: true, draft: true, published: true },
  });
  if (!site) notFound();
  const [usage, user, canRemoveBadge] = await Promise.all([
    getLiveAiUsage(userId),
    db.query.users.findFirst({ where: eq(users.id, userId), columns: { useCase: true } }),
    hasFeature("remove_badge"),
  ]);

  return (
    <RealtimeRoot url={realtimeUrl()}>
      <AiUsageProvider usage={usage}>
        <Editor
          site={{ id: site.id, name: site.name, slug: site.slug, draft: site.draft as PageData, published: site.published !== null }}
          useCase={isUseCase(user?.useCase) ? user.useCase : "other"}
          canRemoveBadge={canRemoveBadge}
        />
      </AiUsageProvider>
    </RealtimeRoot>
  );
}
