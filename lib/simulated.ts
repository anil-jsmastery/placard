// Test-script users always use Clerk test emails. Shared by the server (lib/users.ts) and the browser (PostHogProvider).
export function isSimulatedEmail(email: string) {
  return email.includes("+clerk_test");
}
