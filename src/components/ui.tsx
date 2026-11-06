import type { ReactNode } from "react";

export function PageHeader({ title, intro, action }: { title: string; intro?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold">{title}</h1>
        {intro && <p className="mt-2 text-muted">{intro}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    confirmed: ["pill-settled", "Settled"],
    released: ["pill-settled", "Released"],
    pending: ["pill-pending", "Awaiting signature"],
    validating: ["pill-pending", "Submitting"],
    locked: ["pill-pending", "Locked"],
    failed: ["pill-failed", "Failed"],
    refunded: ["pill-neutral", "Refunded"],
    expired: ["pill-neutral", "Expired"],
  };
  const [cls, label] = map[status] ?? ["pill-neutral", status];
  return <span className={`pill ${cls}`}>{label}</span>;
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="border border-dashed border-rule-strong px-6 py-10">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children && <p className="mt-1 max-w-md text-muted">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Notice({ tone = "neutral", children }: { tone?: "neutral" | "warn" | "danger" | "settled"; children: ReactNode }) {
  const tones = {
    neutral: "bg-accent-wash text-accent-ink",
    warn: "bg-warn-wash text-warn",
    danger: "bg-danger-wash text-danger",
    settled: "bg-settled-wash text-settled",
  };
  return <div role={tone === "danger" ? "alert" : undefined} className={`rounded-md px-3 py-2 text-sm ${tones[tone]}`}>{children}</div>;
}

export function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-t border-rule-strong pt-4 pb-10">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
