import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/auth-shell";

// New accounts go to /start; pricing's "Upgrade to Pro" sends people here with redirect_url=/pricing and back.
export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ redirect_url?: string | string[] }> }) {
  const { redirect_url } = await searchParams;
  return (
    <AuthShell art="sign-up">
      <SignUp forceRedirectUrl={redirect_url === "/pricing" ? "/pricing" : "/start"} />
    </AuthShell>
  );
}
