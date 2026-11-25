import { Brand } from "./brand";
import { AppTabs, AccountButton } from "./app-bar-client";
import { UsageMeter } from "./usage-meter";

export function AppBar() {
  return (
    <header className="appbar">
      <div className="wrap">
        <Brand />
        <AppTabs />
        <UsageMeter />
        {/* Free for now; Step 8 reads the plan from Clerk. */}
        <a className="btn btn-sm btn-soft up-link" href="/pricing">Upgrade</a>
        <AccountButton />
      </div>
    </header>
  );
}
