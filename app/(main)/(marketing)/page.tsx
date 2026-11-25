import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Sparkle } from "lucide-react";

export default async function HomePage() {
  const { isAuthenticated } = await auth();
  if (isAuthenticated) redirect("/sites");

  // Only the hero for now; the rest of the landing page is Step 11.
  return (
    <main id="top" className="page on" data-page="home">
      <section className="hero wrap">
        <span className="pill-note">Prettify restyles any page in one click <span className="new">new</span></span>
        <h1>Describe your work. <span>Get a portfolio.</span></h1>
        <p className="lead">The portfolio builder for designers, developers, photographers, illustrators and writers. Write a sentence or two about your work. Placard writes the sections, picks the photos and builds a page you can publish in one click.</p>
        <div className="hero-actions">
          <Link className="btn btn-blue" href="/start"><Sparkle fill="currentColor" strokeWidth={0} />Build your portfolio free</Link>
          <a className="btn btn-soft" href="#demo" id="watchBtn">Watch a live build</a>
        </div>
        <small>The free plan comes with 10 AI requests a month. No card needed.</small>
      </section>
    </main>
  );
}
