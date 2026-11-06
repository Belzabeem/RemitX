import Receipt from "./Receipt";
import { formatAmount } from "@/lib/client-api";
import { stroopsToXlm } from "@/lib/fees";

export interface Cost {
  sendAmount: string;
  receiveAmount: string;
  effectiveRate: string;
  networkFeeStroops: number;
  platformFee: string;
  estimatedArrival: string;
}

/** Full cost breakdown for one route, drawn as a receipt. */
export default function RouteReceipt({
  from,
  to,
  hops,
  cost,
  minimumReceive,
  title,
}: {
  from: string;
  to: string;
  hops: string[];
  cost: Cost;
  minimumReceive?: string;
  title?: string;
}) {
  return (
    <Receipt
      title={title}
      lines={[
        { label: "You send", value: `${formatAmount(cost.sendAmount, 7)} ${from}` },
        { label: "Route", value: hops.length > 1 ? hops.join(" > ") : "Direct payment", note: hops.length > 1 ? "Each hop is a trade on the Stellar network. Spread and pool fees are already in the amount received." : undefined },
        { label: "Rate", value: `1 ${from} = ${formatAmount(cost.effectiveRate, 6)} ${to}` },
        { label: "Network fee", value: `${stroopsToXlm(cost.networkFeeStroops)} XLM` },
        { label: "RemitX fee", value: cost.platformFee === "0" ? "None" : cost.platformFee, muted: true },
        ...(minimumReceive ? [{ label: "Guaranteed minimum", value: `${formatAmount(minimumReceive, 7)} ${to}`, note: "The transaction fails on the network, and nothing is sent, if the recipient would get less." }] : []),
        { label: "Arrives", value: cost.estimatedArrival },
      ]}
      total={{ label: "Recipient gets", value: `${formatAmount(cost.receiveAmount, 7)} ${to}` }}
    />
  );
}
