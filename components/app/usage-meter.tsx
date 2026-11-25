import { auth } from "@clerk/nextjs/server";
import { getLiveUsage } from "@/lib/usage";
import { UsageMeterLive } from "./usage-meter-live";

// The app bar's meter: the server works out the allowance and seals the used count; the client keeps it live.
export async function UsageMeter() {
  const { userId } = await auth();
  if (!userId) return null;
  return <UsageMeterLive usage={await getLiveUsage(userId)} />;
}
