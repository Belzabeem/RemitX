import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

type Tone = "neutral" | "danger" | "caution" | "positive";

const ICON = { neutral: Info, danger: XCircle, caution: AlertTriangle, positive: CheckCircle2 } as const;

export default function Notice({
  tone = "neutral",
  children,
  role,
}: {
  tone?: Tone;
  children: ReactNode;
  role?: "alert" | "status";
}) {
  const Icon = ICON[tone];
  return (
    <div className="rx-notice" data-tone={tone} role={role ?? (tone === "danger" ? "alert" : undefined)}>
      <Icon size={16} aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
