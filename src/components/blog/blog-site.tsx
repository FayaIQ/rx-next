"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  Clock3,
  Search,
  Share2,
  Sparkles,
  Stethoscope,
  Tag,
} from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/landing/site-chrome";
import { useLocale, type Locale } from "@/i18n/locale-provider";
import type { BlogPost } from "@/lib/blogs";

const COPY = {
  ar: {
    navBlog: "المدونة",
    eyebrow: "معرفة عملية لعيادة أفضل",
    title: "مدونة RX Clinic",
    intro:
      "مقالات وأدلة عملية تساعدك على تنظيم العيادة، تحسين تجربة المريض، وإدارة العمل اليومي بوضوح أكبر.",
    latest: "أحدث المقالات",
    latestBody: "مختارات عملية للطبيب وفريق العيادة.",
    featured: "مقال مميّز",
    readArticle: "اقرأ المقال",
    search: "ابحث في المقالات أو الوسوم...",
    noResults: "ما لقينا مقالات تطابق بحثك.",
    empty: "لا توجد مقالات منشورة حالياً. ترقّب أول مقال قريباً.",
    minRead: "دقيقة قراءة",
    home: "الرئيسية",
    share: "مشاركة المقال",
    copied: "تم نسخ الرابط",
    back: "العودة إلى المدونة",
    related: "قد يهمك أيضاً",
    ctaTitle: "خلّ إدارة عيادتك أسهل",
    ctaBody:
      "جرّب RX Clinic مجاناً ونظّم المرضى والمواعيد والوصفات من مكان واحد.",
    cta: "ابدأ التجربة المجانية",
  },
  en: {
    navBlog: "Blog",
    eyebrow: "Practical knowledge for better clinics",
    title: "RX Clinic Blog",
    intro:
      "Practical articles and guides to help you organize your clinic, improve patient experience, and run each day with clarity.",
    latest: "Latest articles",
    latestBody: "Practical reads for doctors and clinic teams.",
    featured: "Featured article",
    readArticle: "Read article",
    search: "Search articles or tags...",
    noResults: "No articles matched your search.",
    empty: "There are no published articles yet. Check back soon.",
    minRead: "min read",
    home: "Home",
    share: "Share article",
    copied: "Link copied",
    back: "Back to blog",
    related: "You may also like",
    ctaTitle: "Make clinic management easier",
    ctaBody:
      "Try RX Clinic free and manage patients, appointments, and prescriptions in one place.",
    cta: "Start free trial",
  },
} as const;

function formatDate(value: string | null, locale: Locale) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(locale === "ar" ? "ar-IQ" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function excerpt(value: string, length = 180) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > length ? `${clean.slice(0, length - 1).trimEnd()}…` : clean;
}

function DirectionArrow({ locale }: { locale: Locale }) {
  return locale === "ar" ? <ArrowLeft size={17} /> : <ArrowRight size={17} />;
}

function MetaLine({ post, locale, inverse = false }: { post: BlogPost; locale: Locale; inverse?: boolean }) {
  const copy = COPY[locale];
  const date = formatDate(post.date, locale);
  const color = inverse ? "text-white/75" : "text-slate-500";

  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold ${color}`}>
      {date ? (
        <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} />{date}</span>
      ) : null}
      {post.readingTime ? (
        <span className="inline-flex items-center gap-1.5"><Clock3 size={14} />{post.readingTime} {copy.minRead}</span>
      ) : null}
    </div>
  );
}

function ArticleCard({ post }: { post: BlogPost }) {
  const { locale } = useLocale();
  const copy = COPY[locale];
  const tags = post.tags[locale];

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-[#0B5F5A]/10 bg-white shadow-[0_14px_45px_rgba(11,44,61,0.06)] transition duration-300 hover:-translate-y-1 hover:border-[#0B5F5A]/25 hover:shadow-[0_20px_55px_rgba(11,44,61,0.11)]">
      <Link href={`/blog/${post.slug}`} className="relative block aspect-[16/9] overflow-hidden bg-[#E9F4F1]">
        {post.images[0] ? (
          <Image
            src={post.images[0]}
            alt={post.title[locale]}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition duration-500 group-hover:scale-[1.035]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[#0B5F5A]/45"><BookOpen size={44} /></div>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <MetaLine post={post} locale={locale} />
        <h3 className="mt-4 text-xl font-bold leading-snug text-[#0B2C3D]">
          <Link href={`/blog/${post.slug}`} className="transition hover:text-[#0B5F5A]">
            {post.title[locale]}
          </Link>
        </h3>
        <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-600">
          {excerpt(post.description[locale])}
        </p>
        {tags.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{tag}</span>
            ))}
          </div>
        ) : null}
        <Link href={`/blog/${post.slug}`} className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-bold text-[#0B5F5A]">
          {copy.readArticle}<DirectionArrow locale={locale} />
        </Link>
      </div>
    </article>
  );
}

export function BlogIndex({ posts }: { posts: BlogPost[] }) {
  const { locale, dir } = useLocale();
  const copy = COPY[locale];
  const [query, setQuery] = useState("");
  const featured = posts[0];
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale);
    if (!needle) return posts.slice(1);
    return posts.filter((post) =>
      [post.title[locale], post.description[locale], ...post.tags[locale]]
        .join(" ")
        .toLocaleLowerCase(locale)
        .includes(needle)
    );
  }, [locale, posts, query]);

  return (
    <div className="min-h-screen bg-[#F6F8F7] text-[#0B2C3D]" dir={dir}>
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden bg-[#0B2C3D] text-white">
          <div className="absolute inset-0 opacity-70 [background:radial-gradient(circle_at_18%_15%,rgba(45,212,191,0.28),transparent_34%),radial-gradient(circle_at_85%_85%,rgba(8,145,178,0.24),transparent_38%)]" />
          <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-32 sm:px-8 sm:pb-24 sm:pt-36">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-[#B8F3DF] backdrop-blur">
              <Sparkles size={14} />{copy.eyebrow}
            </span>
            <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">{copy.title}</h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">{copy.intro}</p>
          </div>
        </section>

        {featured ? (
          <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
            <article className="group grid overflow-hidden rounded-[2rem] bg-[#0B5F5A] shadow-[0_24px_70px_rgba(11,44,61,0.18)] lg:grid-cols-[1.12fr_0.88fr]">
              <Link href={`/blog/${featured.slug}`} className="relative min-h-72 overflow-hidden bg-[#DDECE8] lg:min-h-[430px]">
                {featured.images[0] ? (
                  <Image src={featured.images[0]} alt={featured.title[locale]} fill priority sizes="(max-width: 1024px) 100vw, 58vw" className="object-cover transition duration-700 group-hover:scale-[1.025]" />
                ) : (
                  <div className="flex h-full items-center justify-center text-[#0B5F5A]/45"><BookOpen size={64} /></div>
                )}
              </Link>
              <div className="flex flex-col justify-center p-7 text-white sm:p-10 lg:p-12">
                <span className="w-fit rounded-full bg-[#B8F3DF] px-3 py-1 text-xs font-bold text-[#0B5F5A]">{copy.featured}</span>
                <h2 className="mt-5 text-3xl font-bold leading-tight sm:text-4xl">{featured.title[locale]}</h2>
                <p className="mt-4 line-clamp-4 text-sm leading-7 text-white/75 sm:text-base">{excerpt(featured.description[locale], 260)}</p>
                <div className="mt-6"><MetaLine post={featured} locale={locale} inverse /></div>
                <Link href={`/blog/${featured.slug}`} className="mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-[#0B5F5A] transition hover:bg-[#E8F5E0]">
                  {copy.readArticle}<DirectionArrow locale={locale} />
                </Link>
              </div>
            </article>
          </section>
        ) : null}

        <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8 sm:pb-24">
          <div className="flex flex-col gap-6 border-b border-slate-200 pb-8 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold text-[#0B5F5A]">{copy.latest}</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{copy.latestBody}</h2>
            </div>
            {posts.length > 1 ? (
              <label className="relative block w-full md:max-w-sm">
                <Search className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.search} className="h-12 w-full rounded-full border border-slate-200 bg-white pe-4 ps-11 text-sm text-[#0B2C3D] shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#0B5F5A]/40 focus:ring-4 focus:ring-[#0B5F5A]/10" />
              </label>
            ) : null}
          </div>

          {posts.length === 0 ? (
            <div className="mt-10 rounded-[1.75rem] border border-dashed border-[#0B5F5A]/25 bg-white px-6 py-16 text-center">
              <BookOpen className="mx-auto text-[#0B5F5A]/45" size={44} />
              <p className="mt-4 font-semibold text-slate-600">{copy.empty}</p>
            </div>
          ) : filtered.length ? (
            <div className="mt-8 grid gap-6 md:grid-cols-2">{filtered.map((post) => <ArticleCard key={post.id} post={post} />)}</div>
          ) : posts.length > 1 ? (
            <div className="mt-10 rounded-[1.75rem] border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-slate-600">{copy.noResults}</div>
          ) : null}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function ShareButton({ title }: { title: string }) {
  const { locale } = useLocale();
  const [copied, setCopied] = useState(false);
  const copy = COPY[locale];

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title, url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button type="button" onClick={share} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-[#0B5F5A] shadow-sm transition hover:border-[#0B5F5A]/30 hover:bg-[#E8F5E0]/50">
      {copied ? <Check size={17} /> : <Share2 size={17} />}{copied ? copy.copied : copy.share}
    </button>
  );
}

function ArticleText({ value }: { value: string }) {
  const paragraphs = value.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
  return (
    <div className="space-y-6 text-[1.05rem] leading-[2.05] text-slate-700">
      {paragraphs.map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 24)}`} className="whitespace-pre-line">{paragraph}</p>)}
    </div>
  );
}

export function BlogArticle({ post, relatedPosts }: { post: BlogPost; relatedPosts: BlogPost[] }) {
  const { locale, dir } = useLocale();
  const copy = COPY[locale];
  const tags = post.tags[locale];
  const heroImage = post.images[0];
  const contentImage = post.images[1];

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-[#0B2C3D]" dir={dir}>
      <SiteHeader />
      <main>
        <section className="border-b border-[#0B5F5A]/10 bg-white">
          <div className="mx-auto max-w-4xl px-5 pb-12 pt-28 sm:px-8 sm:pb-16 sm:pt-32">
            <nav className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-[#0B5F5A]">{copy.home}</Link><span>/</span>
              <Link href="/blog" className="hover:text-[#0B5F5A]">{copy.navBlog}</Link>
            </nav>
            {tags.length ? (
              <div className="mt-8 flex flex-wrap gap-2">{tags.map((tag) => <span key={tag} className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F5E0] px-3 py-1.5 text-xs font-bold text-[#0B5F5A]"><Tag size={12} />{tag}</span>)}</div>
            ) : null}
            <h1 className="mt-5 text-4xl font-bold leading-[1.3] tracking-tight text-[#0B2C3D] sm:text-5xl">{post.title[locale]}</h1>
            <p className="mt-5 text-lg leading-8 text-slate-600">{excerpt(post.description[locale], 260)}</p>
            <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6">
              <MetaLine post={post} locale={locale} />
              <ShareButton title={post.title[locale]} />
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
          {heroImage ? (
            <div className="relative mx-auto aspect-[16/8.5] max-w-5xl overflow-hidden rounded-[1.75rem] bg-[#E9F4F1] shadow-[0_22px_65px_rgba(11,44,61,0.12)]">
              <Image src={heroImage} alt={post.title[locale]} fill priority sizes="(max-width: 1200px) 92vw, 1050px" className="object-cover" />
            </div>
          ) : null}

          <div className="mx-auto mt-10 grid max-w-5xl gap-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
            <article className="min-w-0 rounded-[1.75rem] border border-slate-200/70 bg-white p-6 shadow-[0_14px_45px_rgba(11,44,61,0.05)] sm:p-9 lg:p-11">
              <ArticleText value={post.description[locale]} />
              {contentImage ? (
                <figure className="mt-9">
                  <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-[#E9F4F1]">
                    <Image src={contentImage} alt={post.title[locale]} fill sizes="(max-width: 1024px) 90vw, 680px" className="object-cover" />
                  </div>
                </figure>
              ) : null}
              <div className="mt-10 border-t border-slate-100 pt-7"><ShareButton title={post.title[locale]} /></div>
            </article>

            <aside className="space-y-5 lg:sticky lg:top-24">
              <div className="rounded-[1.5rem] bg-[#0B2C3D] p-6 text-white shadow-lg shadow-[#0B2C3D]/10">
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-white/10 text-[#B8F3DF]"><Stethoscope size={20} /></span>
                <h2 className="mt-4 text-xl font-bold">{copy.ctaTitle}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-300">{copy.ctaBody}</p>
                <Link href="/auth/signup" className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-[#B8F3DF] px-4 py-3 text-sm font-bold text-[#0B5F5A] transition hover:bg-white">{copy.cta}</Link>
              </div>
              <Link href="/blog" className="flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-[#0B5F5A] shadow-sm">
                {locale === "ar" ? <ArrowRight size={17} /> : <ArrowLeft size={17} />}{copy.back}
              </Link>
            </aside>
          </div>
        </div>

        {relatedPosts.length ? (
          <section className="border-t border-slate-200 bg-white">
            <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
              <p className="text-sm font-bold text-[#0B5F5A]">{copy.related}</p>
              <div className="mt-7 grid gap-6 md:grid-cols-2">{relatedPosts.slice(0, 2).map((related) => <ArticleCard key={related.id} post={related} />)}</div>
            </div>
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
