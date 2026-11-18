import { SignIn } from "@clerk/nextjs";
import { Logo } from "@/components/app/logo";
import { authCardAppearance } from "@/lib/clerk-appearance";

export default function SignInPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center gap-8 bg-background px-4 py-16">
      <Logo />
      <SignIn fallbackRedirectUrl="/dashboard" appearance={authCardAppearance} />
    </main>
  );
}
