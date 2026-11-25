import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { fontVars } from "../fonts";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { PostHogProvider } from "@/components/providers/posthog-provider";
import { ToastProvider } from "@/components/app/toast";
import { PaywallProvider } from "@/components/billing/paywall-provider";
import "../globals.css";

export const metadata: Metadata = {
  title: "Placard",
  description: "Describe your work. Get a portfolio.",
};

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVars}>
      <body>
        <ClerkProvider appearance={clerkAppearance}>
          <PostHogProvider>
            <ToastProvider>
              <PaywallProvider>{children}</PaywallProvider>
            </ToastProvider>
          </PostHogProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
