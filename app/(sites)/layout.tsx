import { fontVars } from "../fonts";
import "../globals.css";

// Published portfolios (Step 6): no Clerk, no PostHog.
export default function SitesLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVars}>
      <body>{children}</body>
    </html>
  );
}
