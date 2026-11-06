import { Ledger, LedgerRow } from "@/components/ui/Ledger";
import { formatAmount, formatRate, formatXlmFee } from "@/lib/format";

export interface RouteCostData {
  sendAmount: string;
  receiveAmount: string;
  effectiveRate: string;
  networkFeeStroops: number;
  platformFee: string;
  estimatedArrival: string;
}

/** Full cost of one route as a ledger: what is sent, what it costs, what arrives. */
export default function RouteCost({
  from,
  to,
  hops,
  cost,
  minimumReceive,
  totalLabel = "They receive",
}: {
  from: string;
  to: string;
  hops: string[];
  cost: RouteCostData;
  minimumReceive?: string;
  totalLabel?: string;
}) {
  return (
    <Ledger>
      <LedgerRow label="You send">
        {formatAmount(cost.sendAmount, from)} {from}
      </LedgerRow>
      <LedgerRow label="Route">{hops.length > 1 ? hops.join(" > ") : "Direct payment"}</LedgerRow>
      <LedgerRow label="Rate">
        1 {from} = {formatRate(cost.effectiveRate)} {to}
      </LedgerRow>
      <LedgerRow label="RemitX fee">{cost.platformFee === "0" ? "None" : cost.platformFee}</LedgerRow>
      <LedgerRow label="Network fee">{formatXlmFee(cost.networkFeeStroops)}</LedgerRow>
      {minimumReceive && (
        <LedgerRow label="Guaranteed minimum">
          {formatAmount(minimumReceive, to)} {to}
        </LedgerRow>
      )}
      <LedgerRow label="Arrives">{cost.estimatedArrival}</LedgerRow>
      <LedgerRow label={totalLabel} total>
        {formatAmount(cost.receiveAmount, to)} {to}
      </LedgerRow>
    </Ledger>
  );
}
