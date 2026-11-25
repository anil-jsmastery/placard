import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/auth-shell";

export default function SignUpPage() {
  return (
    <AuthShell art="sign-up">
      <SignUp forceRedirectUrl="/sites" />
    </AuthShell>
  );
}
