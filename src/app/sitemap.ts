import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

// Built per request so newly published courses appear immediately.
export const dynamic = "force-dynamic";

/** Published courses + categories + static pages (spec §12). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.APP_URL.replace(/\/$/, "");
  const [courses, categories] = await Promise.all([
    db.course.findMany({ where: { status: "PUBLISHED", deletedAt: null }, select: { slug: true, updatedAt: true } }),
    db.category.findMany({ select: { slug: true } }),
  ]);

  const staticRoutes = ["", "/courses", "/about", "/contact", "/faq", "/terms", "/privacy", "/refund-policy", "/login", "/signup"].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
  }));
  return [
    ...staticRoutes,
    ...courses.map((c) => ({ url: `${base}/courses/${c.slug}`, lastModified: c.updatedAt })),
    ...categories.map((c) => ({ url: `${base}/categories/${c.slug}`, lastModified: new Date() })),
  ];
}
