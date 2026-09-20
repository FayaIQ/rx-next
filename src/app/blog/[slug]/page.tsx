import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogArticle } from "@/components/blog/blog-site";
import { SeoPage } from "@/components/seo/seo-page";
import { blogPostExcerpt, getBlogPostBySlug, getBlogPosts } from "@/lib/blogs";
import { getSeoPage } from "@/lib/seo-pages";

type BlogArticlePageProps = {
  params: Promise<{ slug: string }>;
};

function validPublishedTime(value: string | null) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export async function generateMetadata({ params }: BlogArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    const legacyPage = getSeoPage(`/blog/${slug}`);
    if (!legacyPage) return {};
    return {
      title: legacyPage.metaTitle,
      description: legacyPage.description,
      alternates: { canonical: legacyPage.path },
      openGraph: {
        type: "article",
        url: legacyPage.path,
        locale: "ar_IQ",
        siteName: "RX Clinic",
        title: legacyPage.metaTitle,
        description: legacyPage.description,
        images: legacyPage.heroImage ? [{ url: legacyPage.heroImage.src, alt: legacyPage.heroImage.alt }] : undefined,
      },
    };
  }

  const description = blogPostExcerpt(post, "ar");
  const image = post.images[0];

  return {
    title: post.title.ar,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    category: post.tags.ar[0] ?? "إدارة العيادات",
    openGraph: {
      type: "article",
      url: `/blog/${post.slug}`,
      locale: "ar_IQ",
      siteName: "RX Clinic",
      title: post.title.ar,
      description,
      publishedTime: validPublishedTime(post.date),
      tags: post.tags.ar,
      images: image ? [{ url: image, alt: post.title.ar }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title.ar,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function BlogArticlePage({ params }: BlogArticlePageProps) {
  const { slug } = await params;
  const [post, posts] = await Promise.all([getBlogPostBySlug(slug), getBlogPosts()]);

  if (!post) {
    const legacyPage = getSeoPage(`/blog/${slug}`);
    if (!legacyPage) notFound();
    return <SeoPage page={legacyPage} />;
  }

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title.ar,
    description: blogPostExcerpt(post, "ar"),
    datePublished: validPublishedTime(post.date),
    image: post.images,
    inLanguage: ["ar-IQ", "en"],
    mainEntityOfPage: `https://rx.faya.dev/blog/${post.slug}`,
    author: { "@type": "Organization", name: "RX Clinic" },
    publisher: {
      "@type": "Organization",
      name: "Faya Dev LTD",
      logo: { "@type": "ImageObject", url: "https://rx.faya.dev/brand/logo.png" },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd).replace(/</g, "\\u003c") }}
      />
      <BlogArticle post={post} relatedPosts={posts.filter((candidate) => candidate.id !== post.id)} />
    </>
  );
}
