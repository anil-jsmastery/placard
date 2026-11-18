import { AppHeader } from "@/components/app/app-header";
import { ensureUser } from "@/lib/users";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await ensureUser();
  return (
    <>
      <AppHeader />
      {children}
    </>
  );
}
