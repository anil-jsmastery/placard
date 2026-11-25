import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { DescribeForm } from "@/components/new/describe-form";
import { db, sites, users } from "@/lib/db";
import { getPlanKey } from "@/lib/plan";
import { PLANS } from "@/lib/plans";
import { KINDS, type Kind } from "@/lib/site/sample-pages";
import { getAiUsage } from "@/lib/usage";

export const metadata = { title: "Describe your portfolio · Placard" };

export default async function NewPage() {
  const { userId } = await auth.protect();
  const [[user], siteCount, usage, planKey] = await Promise.all([
    db.select({ useCase: users.useCase }).from(users).where(eq(users.id, userId)).limit(1),
    db.$count(sites, eq(sites.userId, userId)),
    getAiUsage(userId),
    getPlanKey(),
  ]);
  const useCase: Kind | "other" = KINDS.some((k) => k.key === user?.useCase) ? (user!.useCase as Kind) : "other";
  const plan = PLANS[planKey];

  return (
    <DescribeForm
      useCase={useCase}
      left={usage.left}
      allowance={usage.allowance}
      sites={{ count: siteCount, limit: plan.sites }}
      proRequests={PLANS.pro.aiRequests}
    />
  );
}
