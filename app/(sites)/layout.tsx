import { siteFontVars } from "../fonts";
import "../globals.css";

export default function SitesLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={siteFontVars}>{children}</body>
    </html>
  );
}
