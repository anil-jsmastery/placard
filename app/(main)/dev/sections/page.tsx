import { notFound } from "next/navigation";
import { APP_ENV } from "@/lib/config";
import { REFERENCE_PAGE, SAMPLE_PAGES, type Kind } from "@/lib/site/sample-pages";
import { SectionsPreview } from "./sections-preview";

export const metadata = { title: "Portfolio sections · Placard" };

// Every section in every theme, font and layout (screens/site-sections.html). Not in production.
export default async function DevSectionsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  if (APP_ENV === "prod") notFound();
  const { page: kind } = await searchParams;
  const page = kind && kind in SAMPLE_PAGES ? SAMPLE_PAGES[kind as Kind] : REFERENCE_PAGE;
  return <SectionsPreview key={kind ?? "reference"} page={page} />;
}
