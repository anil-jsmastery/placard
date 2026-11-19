import { AppHeader } from "@/components/app/app-header";
import { RealtimeRoot } from "@/components/realtime/realtime-root";
import { realtimeUrl } from "@/lib/realtime/server";
import { ensureUser } from "@/lib/users";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await ensureUser();
  return (
    <RealtimeRoot url={realtimeUrl()}>
      <AppHeader />
      {children}
    </RealtimeRoot>
  );
}
