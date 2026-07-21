"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ar, type MessageCatalog } from "@/i18n/messages/ar";
import { en } from "@/i18n/messages/en";

export type Locale = "ar" | "en";

const catalogs: Record<Locale, MessageCatalog> = { ar, en };

type NestedValue = string | { [key: string]: NestedValue };

function getByPath(obj: NestedValue, path: string): string | undefined {
  const parts = path.split(".");
  let cur: NestedValue | undefined = obj;
  for (const part of parts) {
    if (cur == null || typeof cur === "string") return undefined;
    cur = cur[part];
  }
  return typeof cur === "string" ? cur : undefined;
}

export type TranslateFn = (
  key: string,
  params?: Record<string, string | number>
) => string;

type LocaleContextValue = {
  locale: Locale;
  dir: "rtl" | "ltr";
  setLocale: (l: Locale) => void;
  t: TranslateFn;
  messages: MessageCatalog;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

const STORAGE_KEY = "rx-locale";

function applyDocumentLocale(locale: Locale) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ar");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    const next = stored === "en" || stored === "ar" ? stored : "ar";
    setLocaleState(next);
    applyDocumentLocale(next);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
    applyDocumentLocale(l);
  }, []);

  const t = useCallback<TranslateFn>(
    (key, params) => {
      const catalog = catalogs[locale] as unknown as NestedValue;
      let text =
        getByPath(catalog, key) ??
        getByPath(ar as unknown as NestedValue, key) ??
        key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          text = text.replaceAll(`{${k}}`, String(v));
        }
      }
      return text;
    },
    [locale]
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      dir: locale === "ar" ? "rtl" : "ltr",
      setLocale,
      t,
      messages: catalogs[locale],
    }),
    [locale, setLocale, t]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale outside provider");
  return ctx;
}

export function useT() {
  return useLocale().t;
}
