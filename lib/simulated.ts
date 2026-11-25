// Clerk test users (and the swarm's) have "+clerk_test" in their email. No database import, so the browser can use it too.
export const isSimulatedEmail = (email: string) => email.includes("+clerk_test");
