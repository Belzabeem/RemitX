import { STATUS_LABEL, type EscrowStatus, type TransactionStatus } from "@/lib/format";

/** A status as a glyph plus a word, so it never relies on colour alone. */
export default function StatusMark({ state }: { state: TransactionStatus | EscrowStatus }) {
  return (
    <span className="rx-status" data-state={state}>
      {STATUS_LABEL[state]}
    </span>
  );
}
