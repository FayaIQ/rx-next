import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeoPage } from "@/components/seo/seo-page";
import { getSeoPage, seoPages } from "@/lib/seo-pages";

type MarketingPageProps = {
  params: Promise<{ slug: string[] }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return seoPages.map((page) => ({
    slug: page.path.split("/").filter(Boolean),
  }));
}

export async function generateMetadata({ params }: MarketingPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getSeoPage(`/${slug.join("/")}`);

  if (!page) return {};

  const image = page.heroImage?.src ?? "/opengraph-image";
  const isArticle = page.kind === "article" || page.kind === "comparison";

  return {
    title: page.metaTitle,
    description: page.description,
    alternates: { canonical: page.path },
    authors: page.author ? [{ name: page.author.name, url: page.author.href }] : undefined,
    creator: page.author?.name ?? "RX Clinic",
    publisher: "Faya Dev LTD",
    category: isArticle ? "إدارة العيادات" : "Clinic management software",
    robots: { index: true, follow: true },
    openGraph: isArticle
      ? {
          type: "article",
          url: page.path,
          locale: "ar_IQ",
          siteName: "RX Clinic",
          title: page.metaTitle,
          description: page.description,
          publishedTime: page.publishedAt,
          modifiedTime: page.updatedAt,
          authors: page.author ? [`https://rx.faya.dev${page.author.href}`] : undefined,
          images: [{ url: image, alt: page.heroImage?.alt ?? page.title }],
        }
      : {
          type: "website",
          url: page.path,
          locale: "ar_IQ",
          siteName: "RX Clinic",
          title: page.metaTitle,
          description: page.description,
          images: [{ url: image, alt: page.heroImage?.alt ?? page.title }],
        },
    twitter: {
      card: "summary_large_image",
      title: page.metaTitle,
      description: page.description,
      images: [image],
    },
  };
}

export default async function MarketingPage({ params }: MarketingPageProps) {
  const { slug } = await params;
  const page = getSeoPage(`/${slug.join("/")}`);

  if (!page) notFound();

  return <SeoPage page={page} />;
}
