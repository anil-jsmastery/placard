"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { createRealtimeClient } from "@neon/realtime/client";
import { drizzleParsers } from "@neon/realtime-drizzle/client";
import { RealtimeProvider } from "@neon/realtime-react";

const RealtimeOn = createContext(false);

/** True inside a `<RealtimeRoot>` that has a URL (Realtime is on for this branch). */
export function useRealtimeOn() {
  return useContext(RealtimeOn);
}

/**
 * One Neon Realtime client for the page (Step 11). The URL is public; the secret never leaves the server.
 * Without a URL (Realtime off on this branch) it renders its children only, and live numbers stay as of page load.
 */
export function RealtimeRoot({ url, children }: { url: string | null; children: ReactNode }) {
  if (!url) return <>{children}</>;
  return <WithClient url={url}>{children}</WithClient>;
}

function WithClient({ url, children }: { url: string; children: ReactNode }) {
  // Created once per mounted app; during the server render it never connects (nothing subscribes there)
  const [client] = useState(() => createRealtimeClient({ url, parsers: drizzleParsers }));
  return (
    <RealtimeProvider client={client}>
      <RealtimeOn.Provider value={true}>{children}</RealtimeOn.Provider>
    </RealtimeProvider>
  );
}
