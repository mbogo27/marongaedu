import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const base = env.APP_URL.replace(/\/$/, "");
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/learn", "/dashboard", "/checkout", "/account", "/api/", "/media/private/"] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
