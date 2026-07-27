import Link from 'next/link';

interface Props {
  label: string;
  value: string;
  sub?: string;
  href?: string;
  /** Draws attention when there is work waiting. */
  emphasis?: boolean;
}

export function StatCard({ label, value, sub, href, emphasis }: Props) {
  const body = (
    <div
      className={`card h-full p-4 transition ${
        emphasis ? 'border-cch-blue/40 bg-cch-blue/5' : ''
      } ${href ? 'hover:border-cch-blue/50' : ''}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
