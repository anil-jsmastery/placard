"use client";

import { createContext, useContext, useState } from "react";
import { createRealtimeClient } from "@neon/realtime/client";
import { drizzleParsers } from "@neon/realtime-drizzle/client";
import { RealtimeProvider } from "@neon/realtime-react";

const RealtimeOn = createContext(false);

// True inside a <RealtimeRoot> with a URL, where <LiveRows> can subscribe.
export const useRealtimeOn = () => useContext(RealtimeOn);

// One Realtime client for the signed-in pages, created once in the browser. The URL is public (the secret never
// leaves the server); without one (Realtime off on this branch) it renders its children only.
export function RealtimeRoot({ url, children }: { url: string | null; children: React.ReactNode }) {
  if (!url) return <>{children}</>;
  return <WithClient url={url}>{children}</WithClient>;
}

function WithClient({ url, children }: { url: string; children: React.ReactNode }) {
  const [client] = useState(() => createRealtimeClient({ url, parsers: drizzleParsers }));
  return (
    <RealtimeProvider client={client}>
      <RealtimeOn.Provider value>{children}</RealtimeOn.Provider>
    </RealtimeProvider>
  );
}
