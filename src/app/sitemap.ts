import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const [courses, categories] = await Promise.all([
    db.course.findMany({ where: { status: "PUBLISHED", deletedAt: null }, select: { slug: true, updatedAt: true } }),
    db.category.findMany({ select: { slug: true } }),
  ]);

  const staticRoutes = ["", "/courses", "/about", "/contact", "/faq", "/terms", "/privacy", "/refund-policy", "/login", "/signup"].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
  }));

  const courseRoutes = courses.map((c) => ({ url: `${base}/courses/${c.slug}`, lastModified: c.updatedAt }));
  const categoryRoutes = categories.map((c) => ({ url: `${base}/categories/${c.slug}`, lastModified: new Date() }));

  return [...staticRoutes, ...courseRoutes, ...categoryRoutes];
}
