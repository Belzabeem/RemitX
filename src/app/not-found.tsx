import Link from "next/link";
import BrandMark from "@/components/BrandMark";

export default function NotFound() {
  return (
    <div className="rx-app">
      <main className="mx-auto flex min-h-screen max-w-[520px] flex-col justify-center px-6 py-16">
        <Link href="/" className="rx-brand !px-0 mb-12 w-fit">
          <BrandMark size={18} />
          RemitX
        </Link>
        <h1 className="rx-title">This page doesn&apos;t exist</h1>
        <p className="rx-lede">The address may have been mistyped, or the page has moved.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/dashboard" className="rx-btn rx-btn-primary">Go to Overview</Link>
          <Link href="/" className="rx-btn rx-btn-secondary">Back to home</Link>
        </div>
      </main>
    </div>
  );
}
