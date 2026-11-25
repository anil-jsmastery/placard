export const two = (n: number) => String(n).padStart(2, "0");

export function HeadRow({ heading, count }: { heading: string; count?: number }) {
  return (
    <div className="pf-head-row">
      <h2 className="pf-h pf-h2">{heading}</h2>
      {count != null && <span className="pf-label">({two(count)})</span>}
    </div>
  );
}
