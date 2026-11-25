import { APP_URL } from "@/lib/config";

// Every missing or unpublished portfolio (proxy.ts sends unknown paths on a portfolio's host here too).
export default function NotFound() {
  return (
    <div className="site" data-theme="mono">
      <div className="pf-empty">
        <div>
          <b>There&apos;s no portfolio here yet.</b>
          <a href={`${APP_URL}/?ref=404`}>Make your own with Placard</a>
        </div>
      </div>
    </div>
  );
}
