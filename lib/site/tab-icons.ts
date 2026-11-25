import type { TAB_ICONS } from "@/lib/sections/schemas";

type TabIcon = (typeof TAB_ICONS)[number];

// The 8 tab icons' shapes, from lucide (lucide-react 1.73.0), for the live page's favicon (no React on the server side).
const PATHS: Record<TabIcon, string> = {
  "pen-tool": "<path d='m18 13-.654-4.736a4 4 0 00-2.756-3.266l-9.163-2.9a2 2 0 00-2.017.493l-.82.819a2 2 0 00-.492 2.017l2.9 9.163a4 4 0 003.266 2.756L13 18'/><path d='M18.648 12.352a1.205 1.205 0 011.704 0l1.296 1.296a1.205 1.205 0 010 1.704l-6.296 6.296a1.205 1.205 0 01-1.704 0l-1.296-1.296a1.205 1.205 0 010-1.704z'/><path d='m3 3 6.586 6.586'/><circle cx='11' cy='11' r='2'/>",
  code: "<path d='m16 18 6-6-6-6'/><path d='m8 6-6 6 6 6'/>",
  camera: "<path d='M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z'/><circle cx='12' cy='13' r='3'/>",
  palette: "<path d='M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z'/><circle cx='13.5' cy='6.5' r='.5' fill='#17171C'/><circle cx='17.5' cy='10.5' r='.5' fill='#17171C'/><circle cx='6.5' cy='12.5' r='.5' fill='#17171C'/><circle cx='8.5' cy='7.5' r='.5' fill='#17171C'/>",
  "book-open": "<path d='M12 5v16'/><path d='M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z'/>",
  sparkles: "<path d='M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z'/><path d='M20 2v4'/><path d='M22 4h-4'/><circle cx='4' cy='20' r='2'/>",
  star: "<path d='M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z'/>",
  globe: "<circle cx='12' cy='12' r='10'/><path d='M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20'/><path d='M2 12h20'/>",
};

export function tabIconSvg(icon: TabIcon): string {
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='#17171C' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>${PATHS[icon] ?? PATHS.sparkles}</svg>`;
}

// For <link rel="icon">.
export function tabIconDataUrl(icon: TabIcon): string {
  return `data:image/svg+xml,${encodeURIComponent(tabIconSvg(icon))}`;
}
