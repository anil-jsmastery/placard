"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Sites", match: (p: string) => p === "/dashboard" || p === "/new" || p.startsWith("/sites") },
  { href: "/account", label: "Account", match: (p: string) => p.startsWith("/account") },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex items-center gap-1 text-sm font-medium">
      {items.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "inline-flex h-10 items-center rounded-md px-3 sm:h-8 bg-accent text-foreground"
                : "inline-flex h-10 items-center rounded-md px-3 sm:h-8 text-muted-foreground hover:bg-accent hover:text-foreground"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
