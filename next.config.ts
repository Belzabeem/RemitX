import path from "node:path";
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Allow Turnstile + Next.js inline scripts (Next injects inline scripts)
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
      // Tailwind-injected styles. Fonts are self-hosted, so no third-party font origins.
      "style-src 'self' 'unsafe-inline'",
      // Allow Google Fonts woff2 + Turnstile font assets
      "font-src 'self' data: https://challenges.cloudflare.com",
      // Allow our images + Turnstile injected pixel/favicon
      "img-src 'self' data: blob: https://challenges.cloudflare.com https://images.higgs.ai https://d8j0ntlcm91z4.cloudfront.net https://stellar.creit.tech",
      // Turnstile connects to challenges.cloudflare.com for widget + validation
      // Wallet hosts: Albedo and xBull sign through hosted pages and messages.
      "connect-src 'self' https://horizon-testnet.stellar.org https://api.stellar.org https://challenges.cloudflare.com https://albedo.link https://wallet.xbull.app",
      // Turnstile renders in an iframe hosted on challenges.cloudflare.com
      "frame-src https://challenges.cloudflare.com https://albedo.link https://wallet.xbull.app",
      "worker-src 'self' blob:",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve("."),
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  poweredByHeader: false,
};

export default nextConfig;
