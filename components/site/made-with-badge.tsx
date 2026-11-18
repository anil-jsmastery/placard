import { APP_NAME, APP_URL } from "@/lib/config";

/** "Made with Placard" pill in the site footer (Free plan). Fixed white and ink in every theme. */
export function MadeWithBadge() {
  return (
    <a
      href={`${APP_URL}/?ref=badge`}
      data-small-target
      className="ml-auto inline-flex items-center gap-2 rounded-full border border-[#e3e5ea] bg-white px-3 py-2 font-sans text-xs font-semibold text-[#16181d] shadow-sm"
    >
      <span className="grid size-4 place-items-center rounded-[4px] bg-[#16181d]" aria-hidden="true">
        <svg viewBox="0 0 16 16" className="size-3">
          <rect x="3" y="3" width="10" height="2.2" rx="1.1" fill="#ffd43b" />
          <rect x="3" y="6.9" width="7.5" height="2.2" rx="1.1" fill="#fff" />
          <rect x="3" y="10.8" width="4.8" height="2.2" rx="1.1" fill="#fff" fillOpacity=".55" />
        </svg>
      </span>
      Made with {APP_NAME}
    </a>
  );
}
