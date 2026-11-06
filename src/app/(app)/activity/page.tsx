"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Download, Search } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Notice from "@/components/ui/Notice";
import TransactionTable, { type TransactionRow } from "@/components/ui/TransactionTable";
import { STATUS_LABEL, type TransactionStatus } from "@/lib/format";

const FILTERS: Array<"all" | TransactionStatus> = ["all", "confirmed", "pending", "validating", "failed"];

function ActivityInner() {
  const searchParams = useSearchParams();
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    const id = setTimeout(async () => {
      try {
        const res = await fetch("/api/transactions?limit=50");
        const json = await res.json();
        if (ignore) return;
        if (res.ok) setTransactions(json.data.transactions);
        else setError(json.error || "Couldn't load activity.");
      } catch {
        if (!ignore) setError("Couldn't reach the server.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }, 0);
    return () => {
      ignore = true;
      clearTimeout(id);
    };
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: transactions.length };
    for (const t of transactions) c[t.status] = (c[t.status] ?? 0) + 1;
    return c;
  }, [transactions]);

  const q = query.trim().toLowerCase();
  const visible = transactions.filter(
    (t) =>
      (filter === "all" || t.status === filter) &&
      (!q ||
        t.recipientAddress.toLowerCase().includes(q) ||
        t.fromAsset.toLowerCase().includes(q) ||
        t.toAsset.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q))
  );

  return (
    <div className="rx-page">
      <PageHeader
        title="Activity"
        description="Every transfer you've started, with its status on Stellar."
        actions={
          <div className="flex items-center gap-2">
            <a
              href="/api/transactions/export?format=csv"
              className="rx-btn rx-btn-secondary"
              download="remitx-transactions.csv"
            >
              <Download size={14} aria-hidden="true" className="inline mr-1.5" />
              Export CSV
            </a>
            <Link href="/send" className="rx-btn rx-btn-primary">
              Send money
            </Link>
          </div>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="rx-seg" role="group" aria-label="Filter by status">
          {FILTERS.filter((f) => f === "all" || counts[f]).map((f) => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === "all" ? "All" : STATUS_LABEL[f]} <span className="rx-count">{counts[f] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="rx-field-icon w-full sm:w-[300px]">
          <label htmlFor="activity-search" className="sr-only">Search transfers</label>
          <input
            id="activity-search"
            className="rx-input"
            placeholder="Search by address, asset or ID"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span aria-hidden="true" className="grid h-[34px] w-[34px] place-items-center text-muted">
            <Search size={16} />
          </span>
        </div>
      </div>

      {error && (
        <div className="mt-8">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}

      <section className="mt-6" aria-busy={loading} aria-label="Transfers">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="rx-skel" style={{ height: 56 }} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="py-10">
            <p className="text-[15px] font-medium">
              {transactions.length === 0 ? "No transfers yet" : "Nothing matches"}
            </p>
            <p className="rx-small mt-1">
              {transactions.length === 0 ? "Transfers you send will be listed here." : "Try a different status or search."}
            </p>
            {transactions.length === 0 && (
              <Link href="/send" className="rx-btn rx-btn-secondary rx-btn-sm mt-4">
                Send your first transfer
              </Link>
            )}
          </div>
        ) : (
          <div className="rx-tablewrap">
            <TransactionTable transactions={visible} />
          </div>
        )}
      </section>
    </div>
  );
}

export default function ActivityPage() {
  return (
    <Suspense fallback={null}>
      <ActivityInner />
    </Suspense>
  );
}
