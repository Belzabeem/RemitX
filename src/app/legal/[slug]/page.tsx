import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BrandMark from "@/components/BrandMark";

const PAGES: Record<string, { title: string; body: string }> = {
  privacy: {
    title: "Privacy Policy",
    body: "RemitX is currently in active development on Stellar testnet. A full privacy policy will be published here before any mainnet launch or handling of real user data.",
  },
  terms: {
    title: "Terms of Service",
    body: "Terms of service will be published here before mainnet launch. Everything in this product today runs on Stellar testnet for development and demonstration purposes only.",
  },
  compliance: {
    title: "Compliance",
    body: "RemitX has not yet completed KYC/AML or regulatory review in any jurisdiction. No real funds move through this product today. It operates on Stellar testnet only.",
  },
  security: {
    title: "Security",
    body: "Found a security issue? Please report it via the Support page rather than a public GitHub issue. RemitX is pre-audit and testnet-only. Do not use real Stellar secret keys with this product.",
  },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = PAGES[slug];
  if (!page) return { title: "Legal" };
  return {
    title: page.title,
    description: `${page.title} for RemitX, a Stellar Network cross-border payments platform.`,
    openGraph: {
      title: `${page.title} | RemitX`,
      description: `${page.title} for RemitX, a Stellar Network cross-border payments platform.`,
      url: `https://remitx.app/legal/${slug}`,
      images: [{ url: "/image/Remitx.png", width: 1200, height: 630, alt: `RemitX - ${page.title}` }],
    },
    alternates: { canonical: `/legal/${slug}` },
  };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = PAGES[slug];
  if (!page) notFound();

  return (
    <div className="rx-app">
      <div className="mx-auto max-w-[760px] px-6 py-10 md:py-16">
        <Link href="/" className="rx-brand !px-0 w-fit">
          <BrandMark size={18} />
          RemitX
        </Link>

        <div className="mt-14 grid gap-10 md:grid-cols-[180px_minmax(0,1fr)] md:gap-14">
          <nav aria-label="Legal" className="flex flex-wrap gap-1 md:flex-col">
            {Object.entries(PAGES).map(([key, p]) => (
              <Link
                key={key}
                href={`/legal/${key}`}
                aria-current={key === slug ? "page" : undefined}
                className="rx-navlink whitespace-nowrap !pl-[26px]"
              >
                {p.title}
              </Link>
            ))}
          </nav>
          <main>
            <h1 className="rx-title">{page.title}</h1>
            <p className="mt-5 max-w-[58ch] text-[16px] leading-[26px] text-ink-2">{page.body}</p>
          </main>
        </div>
      </div>
    </div>
  );
}
