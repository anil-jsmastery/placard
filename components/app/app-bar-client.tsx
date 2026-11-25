"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { User } from "lucide-react";

const TABS = [
  { href: "/sites", label: "Sites" },
  { href: "/account", label: "Account" },
];

export function AppTabs() {
  const pathname = usePathname();
  return (
    <nav className="a-tabs" aria-label="App">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={pathname.startsWith(t.href) ? "on" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

// Clerk's UserButton where the prototype has the avatar: Account and usage, Manage account, Sign out.
export function AccountButton() {
  return (
    <UserButton>
      <UserButton.MenuItems>
        <UserButton.Link label="Account and usage" labelIcon={<User className="size-4" />} href="/account" />
        <UserButton.Action label="manageAccount" />
        <UserButton.Action label="signOut" />
      </UserButton.MenuItems>
    </UserButton>
  );
}
