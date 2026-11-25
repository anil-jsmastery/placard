import { getPlanKey } from "@/lib/plan";
import { Brand } from "./brand";
import { AppTabs, AccountButton } from "./app-bar-client";
import { UsageMeter } from "./usage-meter";

export async function AppBar() {
  const plan = await getPlanKey();
  return (
    <header className="appbar">
      <div className="wrap">
        <Brand />
        <AppTabs />
        <UsageMeter />
        {plan === "pro" ? (
          <span className="pro-tag">Pro</span>
        ) : (
          <a className="btn btn-sm btn-soft up-link" href="/pricing">Upgrade</a>
        )}
        <AccountButton />
      </div>
    </header>
  );
}
