import { MadeWithBadge } from "./made-with-badge";

export function SiteFooter({ title, showBadge }: { title: string; showBadge: boolean }) {
  return (
    <footer className="border-t border-site-border px-6 py-8">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 text-sm text-site-muted">
        <p>© {new Date().getFullYear()} {title}</p>
        {showBadge && <MadeWithBadge />}
      </div>
    </footer>
  );
}
