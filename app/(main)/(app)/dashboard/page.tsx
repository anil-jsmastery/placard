import { EmptyState } from "@/components/app/empty-state";
import { LogoMark } from "@/components/app/logo";

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold sm:text-4xl">Sites</h1>
      <EmptyState
        icon={<LogoMark className="size-8" />}
        title="Build your first site"
        text="Describe your business, portfolio or event in a sentence. The AI builds the page in about 30 seconds."
      >
        <p className="mt-4 text-sm text-muted-foreground">Free includes 1 site and 10 AI requests a month.</p>
      </EmptyState>
    </main>
  );
}
