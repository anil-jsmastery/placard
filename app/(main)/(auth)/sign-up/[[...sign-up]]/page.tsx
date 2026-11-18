import { SignUp } from "@clerk/nextjs";
import { Logo } from "@/components/app/logo";
import { authCardAppearance } from "@/lib/clerk-appearance";

export default function SignUpPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center gap-8 bg-background px-4 py-16">
      <Logo />
      <SignUp forceRedirectUrl="/dashboard" appearance={authCardAppearance} />
    </main>
  );
}
