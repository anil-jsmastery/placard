import { ClerkProvider } from "@clerk/nextjs";
import { appFontVars } from "./fonts";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { PostHogProvider } from "@/components/providers/posthog-provider";
import { PaywallProvider } from "@/components/billing/paywall-provider";
import { Toaster } from "@/components/ui/sonner";
import { APP_ENV } from "@/lib/config";
import "../globals.css";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={appFontVars}>
        <ClerkProvider appearance={clerkAppearance}>
          <PostHogProvider environment={APP_ENV}>
            <PaywallProvider>{children}</PaywallProvider>
            <Toaster position="bottom-center" />
          </PostHogProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
