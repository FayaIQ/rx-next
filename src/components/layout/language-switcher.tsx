"use client";

import { Languages } from "lucide-react";
import { useLocale, type Locale } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";

type Props = {
  /** compact = icon + code only (nav); full = labeled buttons */
  variant?: "compact" | "full" | "toggle";
  className?: string;
};

export function LanguageSwitcher({
  variant = "compact",
  className,
}: Props) {
  const { locale, setLocale, t } = useLocale();

  if (variant === "toggle") {
    const next: Locale = locale === "ar" ? "en" : "ar";
    return (
      <button
        type="button"
        onClick={() => setLocale(next)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-rx-border bg-rx-surface px-2.5 py-1.5 text-xs font-medium text-rx-text-secondary shadow-sm transition hover:bg-rx-bg-subtle",
          className
        )}
        title={t("common.language")}
        aria-label={t("common.language")}
      >
        <Languages size={14} className="opacity-70" />
        {locale === "ar" ? "EN" : "ع"}
      </button>
    );
  }

  if (variant === "full") {
    return (
      <div className={cn("grid gap-2 sm:grid-cols-2", className)}>
        {(
          [
            ["ar", t("common.arabic")],
            ["en", t("common.english")],
          ] as const
        ).map(([code, label]) => (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            className={cn(
              "rounded-xl border px-4 py-3 text-sm font-medium transition-all",
              locale === code
                ? "border-rx-primary bg-rx-primary-light text-rx-primary shadow-sm"
                : "border-rx-border bg-rx-surface text-rx-text-secondary hover:border-rx-primary/30 hover:bg-rx-bg-subtle"
            )}
          >
            {label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex rounded-full border border-rx-border bg-rx-bg-subtle p-0.5",
        className
      )}
      role="group"
      aria-label={t("common.language")}
    >
      {(["ar", "en"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold transition",
            locale === code
              ? "bg-rx-surface text-rx-primary shadow-sm"
              : "text-rx-muted hover:text-rx-text"
          )}
        >
          {code === "ar" ? "ع" : "EN"}
        </button>
      ))}
    </div>
  );
}
