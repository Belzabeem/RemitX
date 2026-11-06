import type { ReactNode } from "react";

export interface ReceiptLine {
  label: ReactNode;
  value: ReactNode;
  note?: ReactNode;
  muted?: boolean;
}

/** The recurring motif: label, dotted leader, figure. Used for quotes, reviews and history. */
export default function Receipt({
  title,
  lines,
  total,
  footer,
  className = "",
  printOnce = false,
}: {
  title?: ReactNode;
  lines: ReceiptLine[];
  total?: ReceiptLine;
  footer?: ReactNode;
  className?: string;
  printOnce?: boolean;
}) {
  return (
    <div className={`receipt ${printOnce ? "print-once" : ""} ${className}`}>
      {title && <h3 className="mb-3 text-sm font-semibold text-muted">{title}</h3>}
      <dl>
        {lines.map((l, i) => (
          <div key={i} className="py-0.5">
            <div className="receipt-line">
              <dt className={l.muted ? "text-muted" : ""}>{l.label}</dt>
              <span className="leader" aria-hidden />
              <dd className={`text-right font-medium ${l.muted ? "text-muted" : ""}`}>{l.value}</dd>
            </div>
            {l.note && <p className="-mt-1 pb-1 text-xs text-muted">{l.note}</p>}
          </div>
        ))}
      </dl>
      {total && (
        <div className="receipt-total flex items-baseline justify-between gap-4">
          <span className="font-semibold">{total.label}</span>
          <span className="text-2xl font-semibold">{total.value}</span>
        </div>
      )}
      {footer && <div className="mt-4 text-xs text-muted">{footer}</div>}
    </div>
  );
}
