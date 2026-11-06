import type { Metadata } from "next";
import PublicHeader from "@/components/PublicHeader";
import VerifyClient from "./verify-client";

export const metadata: Metadata = {
  title: "Verify a transfer",
  description: "Check any RemitX transfer by its Stellar transaction hash, read directly from the network.",
};

export default function VerifyPage() {
  return (
    <>
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-8 sm:px-8">
        <h1 className="text-3xl font-semibold">Verify a transfer</h1>
        <p className="mt-2 max-w-xl text-muted">
          Paste a Stellar transaction hash. The details come straight from the network, not from RemitX&apos;s records, so a receipt can&apos;t be faked.
        </p>
        <VerifyClient />
      </main>
    </>
  );
}
