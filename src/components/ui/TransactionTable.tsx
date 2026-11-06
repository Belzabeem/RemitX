import Link from "next/link";
import StatusMark from "./StatusMark";
import { formatAmount, formatDateTime, truncateMiddle, type TransactionStatus } from "@/lib/format";

export interface TransactionRow {
  id: string;
  fromAsset: string;
  toAsset: string;
  fromAmount: string;
  toAmount: string | null;
  recipientAddress: string;
  status: TransactionStatus;
  createdAt: string;
}

export default function TransactionTable({ transactions }: { transactions: TransactionRow[] }) {
  return (
    <div className="rx-tablescroll">
      <table className="rx-table">
        <thead>
          <tr>
            <th scope="col">Transfer</th>
            <th scope="col" className="hidden md:table-cell">Recipient</th>
            <th scope="col" className="num">Sent</th>
            <th scope="col" className="num hidden sm:table-cell">Received</th>
            <th scope="col" className="hidden sm:table-cell">Status</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.id}>
              <td>
                <Link href={`/activity/${tx.id}`} className="rx-rowlink">
                  <span className="block font-medium">
                    {tx.fromAsset} to {tx.toAsset}
                  </span>
                  <span className="rx-small block whitespace-nowrap">{formatDateTime(tx.createdAt)}</span>
                  <span className="mt-1.5 block sm:hidden">
                    <StatusMark state={tx.status} />
                  </span>
                </Link>
              </td>
              <td className="hidden md:table-cell">
                <span className="rx-mono rx-mono-nowrap" title={tx.recipientAddress}>
                  {truncateMiddle(tx.recipientAddress, 5, 5)}
                </span>
              </td>
              <td className="num whitespace-nowrap">
                {formatAmount(tx.fromAmount, tx.fromAsset)} <span className="text-muted">{tx.fromAsset}</span>
              </td>
              <td className="num hidden whitespace-nowrap sm:table-cell">
                {tx.toAmount ? (
                  <>
                    {formatAmount(tx.toAmount, tx.toAsset)} <span className="text-muted">{tx.toAsset}</span>
                  </>
                ) : (
                  <span className="text-muted">{"\u2013"}</span>
                )}
              </td>
              <td className="hidden sm:table-cell">
                <StatusMark state={tx.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
