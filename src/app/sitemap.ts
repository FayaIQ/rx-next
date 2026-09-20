import type { MetadataRoute } from "next";
import { getBlogPosts } from "@/lib/blogs";
import { seoPages } from "@/lib/seo-pages";

const siteUrl = process.env.APP_URL ?? "https://rx.faya.dev";
const siteUpdatedAt = new Date("2026-08-19");
const staticPaths = new Set(seoPages.map((page) => page.path));

function safeLastModified(value: string | null) {
  if (!value) return siteUpdatedAt;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? siteUpdatedAt : date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const dynamicBlogEntries: MetadataRoute.Sitemap = [];

  try {
    const posts = await getBlogPosts();
    dynamicBlogEntries.push(
      ...posts.filter((post) => !staticPaths.has(`/blog/${post.slug}`)).map((post) => ({
        url: `${siteUrl}/blog/${post.slug}`,
        lastModified: safeLastModified(post.date),
        changeFrequency: "monthly" as const,
        priority: 0.75,
        images: post.images.length ? post.images : undefined,
      }))
    );
  } catch {
    // Keep the static sitemap available if the publishing API is temporarily down.
  }

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
    ...dynamicBlogEntries,
    { url: `${siteUrl}/terms`, lastModified: siteUpdatedAt, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/privacy`, lastModified: siteUpdatedAt, changeFrequency: "yearly", priority: 0.3 },
  ];
}
