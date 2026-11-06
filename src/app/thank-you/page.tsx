import type { Metadata } from "next";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";

export const metadata: Metadata = {
  title: "Transfer sent",
  description: "Your RemitX transfer was submitted to the Stellar network.",
  robots: { index: false, follow: false },
};

export default function ThankYouPage() {
  return (
    <div className="rx-app">
      <main className="mx-auto flex min-h-screen max-w-[520px] flex-col justify-center px-6 py-16">
        <Link href="/dashboard" className="rx-brand !px-0 mb-12 w-fit">
          <BrandMark size={18} />
          RemitX
        </Link>
        <h1 className="rx-title">Transfer sent</h1>
        <p className="rx-lede">It was submitted to the Stellar network. Follow its status in Activity.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/activity" className="rx-btn rx-btn-primary">View activity</Link>
          <Link href="/send" className="rx-btn rx-btn-secondary">Send another</Link>
        </div>
      </main>
    </div>
  );
}
