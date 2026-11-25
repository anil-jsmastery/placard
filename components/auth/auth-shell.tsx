import { Globe, LayoutGrid, ShieldCheck, Sparkles } from "lucide-react";
import { Brand } from "@/components/app/brand";

type Art = "sign-in" | "sign-up";

// The prototype's .auth layout: brand, Clerk's card, legal line; the .auth-art panel on the right.
// The live portfolio preview under the text arrives in Step 11.
export function AuthShell({ art, children }: { art: Art; children: React.ReactNode }) {
  return (
    <main className="page on" data-page={art}>
      <div className="auth">
        <div className="auth-l">
          <Brand />
          <div className="auth-c">
            {children}
            <p className="ck-sec"><i className="ic-slot"><ShieldCheck /></i>Secured by Clerk</p>
          </div>
          <p className="auth-legal">By continuing you agree to the Terms and Privacy policy.</p>
        </div>
        <aside className="auth-r" aria-hidden="true">
          <div className="auth-art" data-art={art}>
            {art === "sign-in" ? (
              <div className="aa-head">
                <h2>Your portfolio, the way you left it.</h2>
                <p>Your drafts and settings are saved. Pick up right where you left off.</p>
              </div>
            ) : (
              <div className="aa-head">
                <h2>Your portfolio is one sentence away.</h2>
                <ul className="aa-list">
                  <li><span className="pi"><LayoutGrid /></span>1 portfolio with a free placard address</li>
                  <li><span className="pi"><Sparkles /></span>10 AI requests a month, Prettify included</li>
                  <li><span className="pi"><Globe /></span>Publish in one click, change it any time</li>
                </ul>
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
