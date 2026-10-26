import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

function remotePattern(url: string | undefined) {
  if (!url) return null;
  try {
    const u = new URL(url);
    return { protocol: (u.protocol === "http:" ? "http" : "https") as "http" | "https", hostname: u.hostname, ...(u.port ? { port: u.port } : {}) };
  } catch {
    return null;
  }
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https" as const, hostname: "picsum.photos" },
      { protocol: "https" as const, hostname: "i.ytimg.com" },
      // Public bucket / CDN when STORAGE_PROVIDER=s3 (spec §8).
      remotePattern(process.env.S3_PUBLIC_BASE_URL),
    ].filter((p): p is NonNullable<typeof p> => !!p) as NonNullable<NextConfig["images"]>["remotePatterns"],
  },
  // CSP (per-request nonce) lives in proxy.ts; the static security headers are here (spec §12).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }] : []),
        ],
      },
    ];
  },
  serverExternalPackages: ["sharp", "pdf-lib", "bcryptjs"],
};

export default nextConfig;
