import { cache } from "react";

const BLOG_API_URL =
  "https://panel.press.faya.dev/api/faya-profile/pages/blogs_rx";

type UnknownRecord = Record<string, unknown>;

export type BlogPost = {
  id: string;
  slug: string;
  title: { ar: string; en: string };
  description: { ar: string; en: string };
  date: string | null;
  readingTime: number | null;
  tags: { ar: string[]; en: string[] };
  images: string[];
};

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function extractText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return value.map(extractText).filter(Boolean).join("\n").trim();
  }
  if (!isRecord(value)) return "";

  if (typeof value.text === "string") return value.text.trim();

  const likelyContent = value.root ?? value.children ?? value.content;
  return extractText(likelyContent);
}

function splitTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(extractText).map((tag) => tag.trim()).filter(Boolean);
  }

  return extractText(value)
    .split(/[,،|]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function validImage(value: unknown): string | null {
  const url = extractText(value);
  if (!url) return null;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

function toSlug(value: string, fallback: string) {
  const slug = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);

  return slug || fallback;
}

function normalizePost(
  value: unknown,
  index: number,
  slugCounts: Map<string, number>
): BlogPost | null {
  if (!isRecord(value)) return null;

  const titleAr = extractText(value.title_ar ?? value.arabic_title);
  const titleEn = extractText(value.title_en ?? value.english_title);
  const descriptionAr = extractText(
    value.arabic_description ?? value.description_ar
  );
  const descriptionEn = extractText(
    value.description_en ?? value.english_description
  );

  if (!titleAr && !titleEn) return null;

  const baseSlug = toSlug(
    titleEn || titleAr,
    `article-${index + 1}`
  );
  const duplicateIndex = (slugCounts.get(baseSlug) ?? 0) + 1;
  slugCounts.set(baseSlug, duplicateIndex);
  const slug = duplicateIndex === 1 ? baseSlug : `${baseSlug}-${duplicateIndex}`;

  const readingTimeValue = Number(
    value.readding_time ?? value.reading_time ?? value.read_time
  );
  const images = [value.image_1, value.image_2]
    .map(validImage)
    .filter((image): image is string => Boolean(image));

  return {
    id: extractText(value.id) || `${index + 1}-${slug}`,
    slug,
    title: {
      ar: titleAr || titleEn,
      en: titleEn || titleAr,
    },
    description: {
      ar: descriptionAr || descriptionEn,
      en: descriptionEn || descriptionAr,
    },
    date: extractText(value.date ?? value.published_at) || null,
    readingTime:
      Number.isFinite(readingTimeValue) && readingTimeValue > 0
        ? readingTimeValue
        : null,
    tags: {
      ar: splitTags(value.tags_ar ?? value.arabic_tags),
      en: splitTags(value.tags_en ?? value.english_tags),
    },
    images,
  };
}

export const getBlogPosts = cache(async (): Promise<BlogPost[]> => {
  const response = await fetch(BLOG_API_URL, {
    headers: { Accept: "application/json" },
    next: { revalidate: 300, tags: ["rx-blog"] },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Blog API responded with ${response.status}`);
  }

  const payload: unknown = await response.json();
  const rows = isRecord(payload) && Array.isArray(payload.data) ? payload.data : [];
  const slugCounts = new Map<string, number>();

  return rows
    .map((row, index) => normalizePost(row, index, slugCounts))
    .filter((post): post is BlogPost => Boolean(post))
    .sort((a, b) => {
      const aTime = a.date ? Date.parse(a.date) : 0;
      const bTime = b.date ? Date.parse(b.date) : 0;
      return bTime - aTime;
    });
});

export async function getBlogPostBySlug(slug: string) {
  const posts = await getBlogPosts();
  return posts.find((post) => post.slug === slug) ?? null;
}

export function blogPostExcerpt(post: BlogPost, locale: "ar" | "en") {
  const description = post.description[locale].replace(/\s+/g, " ").trim();
  if (description.length <= 180) return description;
  return `${description.slice(0, 177).trimEnd()}…`;
}
