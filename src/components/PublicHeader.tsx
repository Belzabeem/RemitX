import Link from "next/link";
import BrandMark from "./BrandMark";

export default function PublicHeader() {
  return (
    <header className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-8">
      <Link href="/" className="flex items-center gap-2 text-lg font-semibold"><BrandMark size={20} /> RemitX</Link>
      <Link href="/login" className="text-sm font-semibold text-accent hover:underline">Sign in</Link>
    </header>
  );
}
