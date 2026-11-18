import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Logo } from "@/components/app/logo";
import { db, users } from "@/lib/db";
import { ensureUser } from "@/lib/users";
import { OnboardingForm } from "./onboarding-form";

// Shown once, right after sign-up (onboarding.html). Logo top-left, no app header.
export default async function OnboardingPage() {
  const user = await ensureUser();
  if (!user) redirect("/sign-in");
  const row = await db.query.users.findFirst({ where: eq(users.id, user.id), columns: { useCase: true } });
  if (row?.useCase) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center px-5 sm:px-8">
        <Logo />
      </header>
      <main className="flex flex-1 items-start justify-center px-5 pt-10 pb-16 sm:pt-20">
        <OnboardingForm />
      </main>
    </div>
  );
}
