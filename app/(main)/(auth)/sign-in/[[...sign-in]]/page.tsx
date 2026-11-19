import { SignIn } from "@clerk/nextjs";
import { Logo } from "@/components/app/logo";
import { authCardAppearance } from "@/lib/clerk-appearance";
import { APP_ENV } from "@/lib/config";

export default function SignInPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center gap-8 bg-background px-4 py-16">
      <Logo />
      {/* A Google or GitHub sign-in with a new account becomes a sign-up: tag it like /sign-up does (Step 1) */}
      <SignIn
        fallbackRedirectUrl="/dashboard"
        unsafeMetadata={{ environment: APP_ENV }}
        appearance={authCardAppearance}
      />
    </main>
  );
}
