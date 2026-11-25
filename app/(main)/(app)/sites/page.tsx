import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Plus } from "lucide-react";
import { EmptyState } from "@/components/sites/empty-state";

export default async function SitesPage() {
  await auth.protect();
  return (
    <>
      <div className="p-head">
        <div>
          <h1>Sites</h1>
          <p>0 of 1 portfolio on Free</p>
        </div>
        <Link className="btn btn-blue" href="/start"><Plus className="size-4" strokeWidth={2} />New portfolio</Link>
      </div>
      <EmptyState />
    </>
  );
}
