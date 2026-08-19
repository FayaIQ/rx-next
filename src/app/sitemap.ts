import type { MetadataRoute } from "next";
import { seoPages } from "@/lib/seo-pages";

const siteUrl = process.env.APP_URL ?? "https://rx.faya.dev";
const siteUpdatedAt = new Date("2026-08-19");

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, lastModified: siteUpdatedAt, changeFrequency: "weekly", priority: 1, images: [`${siteUrl}/opengraph-image`] },
    { url: `${siteUrl}/clinic/free-trial`, lastModified: siteUpdatedAt, changeFrequency: "weekly", priority: 0.9, images: [`${siteUrl}/landing/campaign/rx-general.png`] },
    ...seoPages.map((page) => ({
      url: `${siteUrl}${page.path}`,
      lastModified: new Date(page.updatedAt),
      changeFrequency: page.kind === "article" || page.kind === "collection" ? "monthly" as const : "weekly" as const,
      priority: page.kind === "solution" ? 0.9 : page.kind === "feature" ? 0.8 : 0.7,
      images: page.heroImage ? [`${siteUrl}${page.heroImage.src}`] : undefined,
    })),
    { url: `${siteUrl}/terms`, lastModified: siteUpdatedAt, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/privacy`, lastModified: siteUpdatedAt, changeFrequency: "yearly", priority: 0.3 },
  ];
}
