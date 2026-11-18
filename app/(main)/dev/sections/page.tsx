import { notFound } from "next/navigation";
import { APP_ENV } from "@/lib/config";
import { SAMPLE_PAGE } from "@/lib/site/sample-page";
import { SectionsPreview } from "./sections-preview";

export const metadata = { title: "Sections" };

export default function DevSectionsPage() {
  if (APP_ENV === "prod") notFound();
  return <SectionsPreview page={SAMPLE_PAGE} />;
}
