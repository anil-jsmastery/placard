import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { fontVars } from "../fonts";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { PostHogProvider } from "@/components/providers/posthog-provider";
import { ToastProvider } from "@/components/app/toast";
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
            <ToastProvider>{children}</ToastProvider>
          </PostHogProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
