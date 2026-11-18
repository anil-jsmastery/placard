import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <main>
      <section className="pt-16 sm:pt-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <h1 className="font-display max-w-4xl text-[44px] font-extrabold leading-[0.98] sm:text-[80px]">
            Describe your site.<br className="hidden sm:block" /> Watch it build itself.
          </h1>
          <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
              Write a sentence about your business, portfolio or event. The AI writes the words, picks the layout and builds a one-page site you can edit by hand and publish in one click.
            </p>
            <div className="flex shrink-0 flex-col gap-3">
              <div className="flex flex-wrap gap-3">
                <Link href="/sign-up" className="inline-flex h-11 items-center rounded-md bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90">Build your site free</Link>
                <Link href="#examples" className="inline-flex h-11 items-center rounded-md border border-input bg-card px-5 font-semibold hover:bg-accent">See examples</Link>
              </div>
              <p className="text-sm text-muted-foreground">Free includes 1 site and 10 AI requests a month.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
