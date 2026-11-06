import type { ReactNode } from "react";

/** A list of label/value pairs joined by a dotted leader, like a printed receipt. */
export function Ledger({ children }: { children: ReactNode }) {
  return <dl className="rx-ledger">{children}</dl>;
}

export function LedgerRow({
  label,
  children,
  total,
}: {
  label: ReactNode;
  children: ReactNode;
  total?: boolean;
}) {
  return (
    <div className="rx-leader" data-total={total ? "true" : undefined}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/** For long values (addresses, hashes) that need the full width and can't sit on a leader. */
export function LedgerStack({
  label,
  children,
  action,
}: {
  label: ReactNode;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rx-stackrow">
      <dt>{label}</dt>
      <dd>
        <div className="min-w-0">{children}</div>
        {action}
      </dd>
    </div>
  );
}
