"use client";

import Image from "next/image";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { LinkedFayaDevText } from "@/components/faya-dev-link";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { useLocale } from "@/i18n/locale-provider";
import { trackWhatsAppClick } from "@/lib/google-ads";

const SALES_WHATSAPP = "+9647847076026";

function useSalesWhatsapp() {
  const { locale } = useLocale();
  const message =
    locale === "ar"
      ? "مرحباً، أريد شرحاً مجانياً عن نظام RX Clinic لإدارة العيادات"
      : "Hello, I would like a free RX Clinic setup consultation";

  return `https://wa.me/${SALES_WHATSAPP.replace("+", "")}?text=${encodeURIComponent(message)}`;
}

export function SiteHeader() {
  const { locale, t } = useLocale();

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-50 flex justify-center px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="pointer-events-auto flex max-w-full items-center gap-1 rounded-full border border-white/60 bg-white/90 p-1.5 shadow-[0_8px_32px_rgb(8_51_68/0.18)] backdrop-blur-xl ring-1 ring-slate-900/5">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 rounded-full py-1 pe-3 ps-1.5 transition hover:bg-slate-100"
        >
          <span className="relative h-8 w-8 overflow-hidden rounded-full bg-[#0B5F5A]/10 ring-1 ring-[#0B5F5A]/15">
            <Image
              src="/brand/logo.png"
              alt=""
              width={32}
              height={32}
              className="h-full w-full object-contain"
              priority
            />
          </span>
          <span className="text-sm font-bold tracking-tight text-[#0B2C3D]">
            RX Clinic
          </span>
        </Link>

        <div className="mx-0.5 h-8 w-px shrink-0 bg-slate-200" aria-hidden />

        <LanguageSwitcher variant="toggle" className="shrink-0 shadow-none" />
        <Link
          href="/blog"
          className="hidden shrink-0 rounded-full px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-[#0B5F5A] md:inline"
        >
          {locale === "ar" ? "المدونة" : "Blog"}
        </Link>
        <Link
          href="/auth/signin"
          className="hidden shrink-0 rounded-full px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-[#0B5F5A] sm:inline"
        >
          {t("landing.navSignIn")}
        </Link>
        <Link
          href="/auth/signup"
          className="shrink-0 rounded-full bg-[#0B5F5A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#094E4A]"
        >
          {t("landing.navStart")}
        </Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const { t } = useLocale();
  const whatsappUrl = useSalesWhatsapp();
  const year = new Date().getFullYear();

  return (
    <>
      <footer className="border-t border-slate-200 bg-[#0B2C3D] text-slate-300">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="text-lg font-bold text-white">RX Clinic</p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-400">
              <LinkedFayaDevText
                text={t("landing.footerAbout")}
                className="text-slate-300 hover:text-white"
              />
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              {t("landing.footerLinks")}
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/solutions/clinic-management-software-iraq" className="hover:text-white">
                  برنامج إدارة العيادات في العراق
                </Link>
              </li>
              <li>
                <Link href="/solutions/dental-clinic-software" className="hover:text-white">
                  برنامج عيادة أسنان
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-white">
                  دليل إدارة العيادات
                </Link>
              </li>
              <li>
                <Link href="/auth/signup" className="hover:text-white">
                  {t("landing.ctaTrial")}
                </Link>
              </li>
              <li>
                <Link href="/auth/signin" className="hover:text-white">
                  {t("landing.ctaSignIn")}
                </Link>
              </li>
              <li>
                <Link href="/auth/login/secretary" className="hover:text-white">
                  {t("landing.ctaSecretary")}
                </Link>
              </li>
              <li>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackWhatsAppClick("footer")}
                  className="hover:text-white"
                >
                  {t("landing.ctaWhatsApp")}
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <p className="mx-auto max-w-6xl px-5 py-5 text-xs text-slate-500 sm:px-8">
            <LinkedFayaDevText
              text={t("landing.footerCopy", { year })}
              className="text-slate-400 hover:text-white"
            />
          </p>
        </div>
      </footer>

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        onClick={() => trackWhatsAppClick("floating_mobile")}
        aria-label={t("landing.ctaWhatsApp")}
        className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] end-4 z-50 inline-flex items-center gap-2 rounded-full bg-[#0B5F5A] px-4 py-3 text-sm font-bold text-white shadow-[0_12px_35px_rgba(11,95,90,0.35)] transition hover:bg-[#094E4A] sm:hidden"
      >
        <MessageCircle size={19} />
        {t("landing.ctaWhatsAppShort")}
      </a>
    </>
  );
}
