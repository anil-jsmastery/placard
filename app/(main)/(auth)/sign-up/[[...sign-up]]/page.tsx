import { SignUp } from "@clerk/nextjs";
import { Logo } from "@/components/app/logo";
import { authCardAppearance } from "@/lib/clerk-appearance";
import { APP_ENV } from "@/lib/config";

export default function SignUpPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center gap-8 bg-background px-4 py-16">
      <Logo />
      <SignUp
        forceRedirectUrl="/onboarding"
        unsafeMetadata={{ environment: APP_ENV }}
        appearance={authCardAppearance}
      />
    </main>
  );
}
