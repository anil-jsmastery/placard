export function Status({ live = false, children }: { live?: boolean; children?: React.ReactNode }) {
  return <span className={live ? "status live" : "status"}>{children ?? (live ? "Published" : "Draft")}</span>;
}
