type Props = {
  icon: React.ReactNode;
  title: string;
  text: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
};

// Dashed card, icon, title, text, action (dashboard-empty.html)
export function EmptyState({ icon, title, text, action, children }: Props) {
  return (
    <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-input bg-card px-6 py-16 text-center sm:py-24">
      <span className="grid size-14 place-items-center rounded-xl bg-primary" aria-hidden="true">
        {icon}
      </span>
      <h2 className="mt-6 font-display text-2xl font-bold">{title}</h2>
      <p className="mt-2 max-w-sm text-muted-foreground">{text}</p>
      {action ? <div className="mt-8">{action}</div> : null}
      {children}
    </div>
  );
}
