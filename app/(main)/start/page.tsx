import { eq } from "drizzle-orm";
import { Brand } from "@/components/app/brand";
import { KindCards } from "@/components/onboarding/kind-cards";
import { db, users } from "@/lib/db";
import { KINDS, type Kind } from "@/lib/site/sample-pages";
import { ensureUser } from "@/lib/users";

export const metadata = { title: "What do you do? · Placard" };

// Outside the (app) layout, so it makes sure the users row (and signed_up) exist first.
export default async function StartPage() {
  const { id } = await ensureUser();
  const [user] = await db.select({ useCase: users.useCase }).from(users).where(eq(users.id, id)).limit(1);
  const current = KINDS.some((k) => k.key === user?.useCase) ? (user!.useCase as Kind) : null;

  return (
    <main className="page on">
      <div className="ob">
        <div className="ob-top">
          <Brand />
          <div className="ob-steps" aria-label="Step 1 of 2"><i className="on"></i><i></i><span>Step 1 of 2</span></div>
        </div>
        <div className="ob-main">
          <div className="ob-in">
            <h1>What do you do?</h1>
            <p className="sub">Pick the closest match. We&apos;ll show you example prompts and sections that fit.</p>
            <KindCards initial={current} />
          </div>
        </div>
      </div>
    </main>
  );
}
