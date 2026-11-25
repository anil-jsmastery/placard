import { AppBar } from "@/components/app/app-bar";
import { ensureUser } from "@/lib/users";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await ensureUser();
  return (
    <>
      <AppBar />
      <main className="page on a-page">
        <div className="wrap">{children}</div>
      </main>
    </>
  );
}
