import type { Metadata } from "next";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import { NETWORK_LABEL } from "@/lib/network-label";
import VerifyClient from "./verify-client";

export const metadata: Metadata = {
  title: "Verify a transfer",
  description: "Check any RemitX transfer by its Stellar transaction hash, read directly from the network.",
};

export default function VerifyPage() {
  return (
    <div className="rx-app min-h-screen">
      <header className="border-b border-line px-6 py-4">
        <div className="mx-auto flex max-w-[800px] items-center justify-between">
          <Link href="/" className="rx-brand !px-0">
            <BrandMark size={18} />
            RemitX
          </Link>
          <div className="flex items-center gap-4">
            <span className="rx-small">{NETWORK_LABEL}</span>
            <Link href="/dashboard" className="rx-link text-[14px]">
              Dashboard
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[800px] px-6 py-12">
        <VerifyClient />
      </main>
    </div>
  );
}
