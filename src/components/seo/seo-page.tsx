import Link from "next/link";
import Image from "next/image";
import { ArrowUpLeft, BadgeCheck, Check, ChevronLeft, Clock3, MessageCircle, Quote, ShieldCheck, UserRoundCheck } from "lucide-react";
import { getSeoPageLink, type SeoPageConfig } from "@/lib/seo-pages";
import { TrackedLink } from "@/components/seo/tracked-link";

const SITE_URL = "https://rx.faya.dev";
const WHATSAPP_URL = "https://wa.me/9647847076026?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%D8%8C%20%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%B4%D8%B1%D8%AD%D8%A7%D9%8B%20%D9%85%D8%AC%D8%A7%D9%86%D9%8A%D8%A7%D9%8B%20%D8%B9%D9%86%20%D9%86%D8%B8%D8%A7%D9%85%20RX%20Clinic";

export function jsonLdFor(page: SeoPageConfig) {
  const parts = page.path.split("/").filter(Boolean);
  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "RX Clinic", item: SITE_URL },
      ...parts.map((part, index) => ({
        "@type": "ListItem",
        position: index + 2,
        name: index === parts.length - 1 ? page.metaTitle : part === "blog" ? "الدليل" : part === "features" ? "المميزات" : "الحلول",
        item: `${SITE_URL}/${parts.slice(0, index + 1).join("/")}`,
      })),
    ],
  };

  const primary = page.kind === "article" || page.kind === "comparison"
    ? {
        "@type": "Article",
        "@id": `${SITE_URL}${page.path}#article`,
        headline: page.title,
        description: page.description,
        inLanguage: "ar-IQ",
        datePublished: page.publishedAt,
        dateModified: page.updatedAt,
        mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}${page.path}` },
        image: page.heroImage ? `${SITE_URL}${page.heroImage.src}` : `${SITE_URL}/opengraph-image`,
        author: { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: page.author?.name ?? "فريق RX Clinic", url: `${SITE_URL}${page.author?.href ?? "/about/rx-clinic"}` },
        publisher: { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: "Faya Dev LTD", url: "https://faya.dev" },
        about: { "@type": "SoftwareApplication", name: "RX Clinic", applicationCategory: "BusinessApplication" },
      }
    : page.kind === "collection"
      ? { "@type": "CollectionPage", name: page.title, description: page.description, inLanguage: "ar-IQ", url: `${SITE_URL}${page.path}` }
      : page.kind === "company"
        ? { "@type": "AboutPage", name: page.title, description: page.description, inLanguage: "ar-IQ", url: `${SITE_URL}${page.path}`, about: { "@id": `${SITE_URL}/#organization` } }
      : {
          "@type": "SoftwareApplication",
          name: "RX Clinic",
          applicationCategory: "BusinessApplication",
          applicationSubCategory: "Clinic management software",
          operatingSystem: "Web",
          inLanguage: ["ar", "en"],
          description: page.description,
          url: `${SITE_URL}${page.path}`,
          offers: { "@type": "Offer", price: "160000", priceCurrency: "IQD", availability: "https://schema.org/InStock", url: `${SITE_URL}/auth/signup` },
          featureList: page.highlights,
          provider: { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: "Faya Dev LTD", url: "https://faya.dev" },
        };

  const graph: Record<string, unknown>[] = [breadcrumb, primary];
  if (page.faq.length) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: page.faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    });
  }

  return { "@context": "https://schema.org", "@graph": graph };
}

export function SeoPage({ page }: { page: SeoPageConfig }) {
  const related = page.relatedPaths.map(getSeoPageLink).filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <main className="min-h-screen bg-[#F6F8F7] text-[#0B2C3D]" dir="rtl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFor(page)).replace(/</g, "\\u003c") }}
      />

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5 font-bold">
            <Image src="/brand/logo.png" alt="شعار RX Clinic" width={38} height={38} className="rounded-full bg-[#E8F5E0] object-contain" />
            <span>RX Clinic</span>
          </Link>
          <nav className="hidden items-center gap-5 text-sm text-slate-600 md:flex" aria-label="التنقل الرئيسي">
            <Link href="/solutions/clinic-management-software-iraq" className="hover:text-[#0B5F5A]">الحلول</Link>
            <Link href="/solutions/dental-clinic-software" className="hover:text-[#0B5F5A]">عيادات الأسنان</Link>
            <Link href="/blog" className="hover:text-[#0B5F5A]">الدليل</Link>
          </nav>
          <TrackedLink href="/auth/signup" eventLabel="ابدأ مجاناً" eventLocation="header" className="rounded-full bg-[#0B5F5A] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#094E4A]">ابدأ مجاناً</TrackedLink>
        </div>
      </header>

      <section className="overflow-hidden border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <nav aria-label="مسار الصفحة" className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <Link href="/" className="hover:text-[#0B5F5A]">الرئيسية</Link>
            <ChevronLeft size={14} aria-hidden />
            <span>{page.kind === "article" || page.kind === "collection" ? "الدليل" : page.kind === "feature" ? "المميزات" : "الحلول"}</span>
          </nav>
          <div className="mt-8 grid items-center gap-10 lg:grid-cols-[1fr_0.72fr]">
            <div>
              <p className="text-sm font-bold text-[#0B5F5A]">{page.eyebrow}</p>
              <h1 className="mt-4 max-w-4xl text-4xl font-extrabold leading-[1.25] tracking-tight sm:text-5xl">{page.title}</h1>
              <p className="mt-6 max-w-3xl text-lg leading-9 text-slate-600">{page.intro}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <TrackedLink href="/auth/signup" eventLabel="تجربة 14 يوماً" eventLocation="hero" className="inline-flex items-center gap-2 rounded-full bg-[#0B5F5A] px-6 py-3 text-sm font-bold text-white hover:bg-[#094E4A]">
                  جرّب RX Clinic لمدة 14 يوماً <ArrowUpLeft size={16} />
                </TrackedLink>
                <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-[#0B5F5A]/25 bg-white px-6 py-3 text-sm font-bold text-[#0B5F5A] hover:bg-[#E8F5E0]">
                  <MessageCircle size={17} /> احجز شرحاً مجانياً
                </a>
              </div>
            </div>
            <aside className="overflow-hidden rounded-[2rem] border border-[#0B5F5A]/10 bg-[#EFF8F4]" aria-label="أهم المميزات">
              {page.heroImage ? (
                <Image
                  src={page.heroImage.src}
                  alt={page.heroImage.alt}
                  width={page.heroImage.width}
                  height={page.heroImage.height}
                  priority={page.kind === "article"}
                  sizes="(max-width: 1024px) 100vw, 35vw"
                  className="aspect-[16/10] w-full object-cover"
                />
              ) : null}
              <div className="p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-[#0B5F5A] text-white"><BadgeCheck size={22} /></span>
                <div><p className="font-bold">ما الذي ستحصل عليه؟</p><p className="text-sm text-slate-500">ميزات عملية لعمل العيادة</p></div>
              </div>
              <ul className="mt-6 space-y-3">
                {page.highlights.map((item) => (
                  <li key={item} className="flex gap-3 rounded-2xl bg-white px-4 py-3 text-sm leading-6 shadow-sm">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#E8F5E0] text-[#0B5F5A]"><Check size={12} strokeWidth={3} /></span>{item}
                  </li>
                ))}
              </ul>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <article className="mx-auto max-w-4xl px-5 py-16 sm:px-8 sm:py-20">
        {(page.author || page.reviewedBy) ? (
          <div className="mb-10 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            {page.author ? (
              <div className="flex items-center gap-3">
                <UserRoundCheck className="text-[#0B5F5A]" size={20} />
                <div><span className="font-bold text-slate-800">إعداد: </span><Link href={page.author.href} className="font-bold text-[#0B5F5A] hover:underline">{page.author.name}</Link><p className="mt-0.5 text-xs">{page.author.role}</p></div>
              </div>
            ) : null}
            <div className="flex items-center gap-2 text-xs"><Clock3 size={16} /> آخر مراجعة: <time dateTime={page.updatedAt}>{page.updatedAt}</time></div>
          </div>
        ) : null}

        {page.quickAnswer ? (
          <section className="mb-12 rounded-[1.75rem] border border-[#0B5F5A]/20 bg-[#EFF8F4] p-6 sm:p-8" aria-labelledby="quick-answer-title">
            <div className="flex items-center gap-3 text-[#0B5F5A]"><Quote size={23} /><h2 id="quick-answer-title" className="text-xl font-extrabold">الجواب المختصر</h2></div>
            <p className="mt-4 text-lg font-medium leading-9 text-slate-700">{page.quickAnswer}</p>
          </section>
        ) : null}

        {page.keyFacts?.length ? (
          <section className="mb-14" aria-labelledby="key-facts-title">
            <h2 id="key-facts-title" className="text-2xl font-extrabold">حقائق سريعة</h2>
            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              {page.keyFacts.map((fact) => (
                <div key={fact.label} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <dt className="text-sm text-slate-500">{fact.label}</dt>
                  <dd className="mt-2 font-extrabold text-[#0B2C3D]">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        <div className="space-y-14">
          {page.sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{section.title}</h2>
              <div className="mt-5 space-y-4 text-[1.05rem] leading-9 text-slate-600">
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
              {section.bullets?.length ? (
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {section.bullets.map((item) => (
                    <li key={item} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-700"><Check className="mt-1 shrink-0 text-[#0B5F5A]" size={17} />{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        {page.faq.length ? (
          <section className="mt-20 border-t border-slate-200 pt-14">
            <p className="text-sm font-bold text-[#0B5F5A]">أسئلة شائعة</p>
            <h2 className="mt-3 text-3xl font-extrabold">إجابات قبل أن تبدأ</h2>
            <div className="mt-8 space-y-3">
              {page.faq.map((item) => (
                <details key={item.question} className="rounded-2xl border border-slate-200 bg-white p-5 open:border-[#0B5F5A]/25">
                  <summary className="cursor-pointer list-none font-bold">{item.question}</summary>
                  <p className="mt-4 leading-8 text-slate-600">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>
        ) : null}

        {(page.kind === "article" || page.kind === "comparison") ? (
          <aside className="mt-12 flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-600">
            <ShieldCheck className="mt-1 shrink-0 text-[#0B5F5A]" size={22} />
            <div>
              <p className="font-bold text-slate-800">منهجية التحرير والمراجعة</p>
              <p className="mt-1">أُعد هذا الدليل بمراجعة سير العمل والوظائف المتاحة فعلياً في RX Clinic. المحتوى تشغيلي وتعريفي، ولا يمثل استشارة طبية أو قانونية.</p>
              {page.reviewedBy ? <p className="mt-2 text-xs">راجعه: <Link href={page.reviewedBy.href} className="font-bold text-[#0B5F5A] hover:underline">{page.reviewedBy.name}</Link> — {page.reviewedBy.role}</p> : null}
            </div>
          </aside>
        ) : null}
      </article>

      <section className="border-y border-slate-200 bg-white px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-extrabold">استكشف أدلة وحلولاً مرتبطة</h2>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {related.map((item) => (
              <Link key={item.href} href={item.href} className="group rounded-2xl border border-slate-200 bg-[#F6F8F7] p-5 transition hover:-translate-y-0.5 hover:border-[#0B5F5A]/30 hover:bg-white hover:shadow-lg">
                <h3 className="font-bold group-hover:text-[#0B5F5A]">{item.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm leading-7 text-slate-600">{item.description}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#0B5F5A]">اقرأ المزيد <ArrowUpLeft size={14} /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0B2C3D] px-5 py-16 text-center text-white sm:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-extrabold">اختبر النظام على عمل عيادتك الحقيقي</h2>
          <p className="mx-auto mt-4 max-w-2xl leading-8 text-slate-300">ابدأ تجربة مجانية لمدة 14 يوماً من دون بطاقة دفع. الإعداد والتدريب مجانيان، والاشتراك السنوي 160 ألف دينار عراقي.</p>
          <TrackedLink href="/auth/signup" eventLabel="إنشاء حساب طبيب" eventLocation="bottom_cta" className="mt-7 inline-flex rounded-full bg-white px-7 py-3.5 text-sm font-bold text-[#0B2C3D] hover:bg-[#E8F5E0]">إنشاء حساب طبيب</TrackedLink>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#081F2B] px-5 py-8 text-sm text-slate-400 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-4 sm:flex-row">
          <p>© 2026 RX Clinic — أحد منتجات Faya Dev LTD</p>
          <div className="flex flex-wrap gap-4"><Link href="/blog" className="hover:text-white">الدليل</Link><Link href="/about/rx-clinic" className="hover:text-white">عن RX Clinic</Link><Link href="/privacy" className="hover:text-white">الخصوصية</Link><Link href="/terms" className="hover:text-white">الشروط</Link></div>
        </div>
      </footer>
    </main>
  );
}
