"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Locale = "ar" | "en";

const messages = {
  ar: {
    appName: "RX - نظام الوصفات الطبية",
    save: "حفظ",
    cancel: "إلغاء",
    loading: "جاري التحميل...",
    language: "اللغة",
  },
  en: {
    appName: "RX - Prescription System",
    save: "Save",
    cancel: "Cancel",
    loading: "Loading...",
    language: "Language",
  },
} as const;

type Messages = (typeof messages)[Locale];

const LocaleContext = createContext<{
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Messages;
} | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ar");

  useEffect(() => {
    const stored = localStorage.getItem("rx-locale") as Locale | null;
    if (stored === "ar" || stored === "en") setLocaleState(stored);
  }, []);

  function setLocale(l: Locale) {
    setLocaleState(l);
    localStorage.setItem("rx-locale", l);
    document.documentElement.lang = l;
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
  }

  return (
    <LocaleContext.Provider
      value={{ locale, setLocale, t: messages[locale] }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale outside provider");
  return ctx;
}
