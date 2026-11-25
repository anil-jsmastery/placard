"use client";

import { useClerk } from "@clerk/nextjs";
import { LogOut, Settings } from "lucide-react";

// "Manage billing": Clerk's <UserProfile /> at its billing page, where Clerk handles cancelling and cards.
export function ManageBillingButton() {
  const clerk = useClerk();
  return (
    <button type="button" className="btn btn-sm btn-soft" onClick={() => clerk.openUserProfile({ __experimental_startPath: "/billing" })}>
      Manage billing
    </button>
  );
}

// The profile's "Manage account" (Clerk's <UserProfile />) and "Sign out".
export function ProfileActions() {
  const clerk = useClerk();
  return (
    <div className="prof-acts">
      <button type="button" className="btn btn-sm btn-soft" onClick={() => clerk.openUserProfile()}>
        <Settings />Manage account
      </button>
      <button type="button" className="btn btn-sm btn-soft" onClick={() => void clerk.signOut({ redirectUrl: "/" })}>
        <LogOut />Sign out
      </button>
    </div>
  );
}
