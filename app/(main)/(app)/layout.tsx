import { AppBar } from "@/components/app/app-bar";
import { RealtimeRoot } from "@/components/realtime/realtime-root";
import { realtimeUrl } from "@/lib/realtime/server";
import { ensureUser } from "@/lib/users";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await ensureUser();
  return (
    <RealtimeRoot url={realtimeUrl()}>
      <AppBar />
      <main className="page on a-page">
        <div className="wrap">{children}</div>
      </main>
    </RealtimeRoot>
  );
}
