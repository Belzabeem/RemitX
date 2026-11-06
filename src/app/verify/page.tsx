import type { Metadata } from "next";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import VerifyClient from "./verify-client";

export const metadata: Metadata = {
  title: "Verify a transfer",
  description: "Check any RemitX transfer by its Stellar transaction hash, read directly from the network.",
};

export default function VerifyPage() {
  return (
    <div className="rx-app">
      <header className="mx-auto flex w-full max-w-[1120px] items-center justify-between px-5 py-6 md:px-10">
        <Link href="/" className="rx-brand !px-0">
          <BrandMark size={18} />
          RemitX
        </Link>
        <Link href="/dashboard" className="rx-btn rx-btn-quiet rx-btn-sm">
          Open app
        </Link>
      </header>

      <main className="mx-auto w-full max-w-[720px] px-5 pb-20 pt-6 md:px-10 md:pt-12">
        <h1 className="rx-title">Verify a transfer</h1>
        <p className="rx-lede">
          Paste a Stellar transaction hash. The details come straight from the network, not from RemitX&apos;s records, so a receipt can&apos;t be faked.
        </p>
        <VerifyClient />
      </main>
    </div>
  );
}
