import { createSite } from "@/app/(main)/(app)/sites/actions";

export function EmptyState() {
  return (
    <div className="empty-state">
      <div className="art">
        <i></i>
        <i></i>
        <i style={{ width: "55%" }}></i>
      </div>
      <h3>No portfolio yet</h3>
      <p>Tell Placard what you do in a sentence or two and it builds the first draft, photos included.</p>
      {/* Step 4 points this at /start. */}
      <form action={createSite} className="contents">
        <button type="submit" className="btn btn-blue">Build your portfolio</button>
      </form>
    </div>
  );
}
