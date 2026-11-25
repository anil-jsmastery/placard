import { APP_URL } from "@/lib/config";

export function SiteFooter({ title, showBadge }: { title: string; showBadge: boolean }) {
  return (
    <footer className="pf-foot">
      <span>© {new Date().getFullYear()} {title}</span>
      {showBadge && (
        <a className="pf-badge" href={`${APP_URL}/?ref=badge`}><i />Made with Placard</a>
      )}
    </footer>
  );
}
