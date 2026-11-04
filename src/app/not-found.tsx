import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <BrandMark size={24} className="text-primary" />
          <span className="font-medium tracking-[-0.03em] text-2xl tracking-[-0.01em] text-primary">RemitX</span>
        </div>

        <div className="text-[120px] lg:text-[160px] font-semibold text-primary/10 tracking-[-0.05em] leading-none select-none animate-elastic">
          404
        </div>

        <h1 className="text-2xl lg:text-3xl font-medium tracking-[-0.035em] text-primary mb-3 animate-slide-blur">
          Page not found
        </h1>
        <p className="text-sm text-neutral-500 mb-8 animate-slide-blur delay-100">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Let&apos;s get you back on track.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center animate-slide-blur delay-200">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-full text-sm font-semibold hover:shadow-lg transition-all active:scale-95"
          >
            <Home size={16} />
            Back to Home
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-neutral-200 text-neutral-700 rounded-full text-sm font-semibold hover:bg-neutral-50 transition-all active:scale-95"
          >
            <ArrowLeft size={16} />
            Go to Login
          </Link>
        </div>
      </div>
    </main>
  );
}