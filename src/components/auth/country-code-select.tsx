"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { PHONE_COUNTRIES, type PhoneCountry } from "@/lib/phone-countries";
import { cn } from "@/lib/utils";

interface CountryCodeSelectProps {
  value: PhoneCountry;
  onChange: (country: PhoneCountry) => void;
  locale: string;
  label: string;
}

export function CountryCodeSelect({
  value,
  onChange,
  locale,
  label,
}: CountryCodeSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 items-center gap-1.5 rounded-xl border border-rx-border bg-rx-surface px-3 text-sm text-rx-text shadow-sm transition-colors hover:border-slate-300 focus-visible:border-rx-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rx-primary/20"
      >
        <span className="text-base leading-none">{value.flag}</span>
        <span dir="ltr" className="font-medium">
          {value.dial}
        </span>
        <ChevronDown
          size={14}
          className={cn(
            "text-rx-muted transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={label}
          className="absolute start-0 top-full z-30 mt-1 max-h-64 w-56 overflow-y-auto rounded-xl border border-rx-border bg-rx-surface py-1 shadow-lg"
        >
          {PHONE_COUNTRIES.map((country) => {
            const selected = country.iso === value.iso;
            return (
              <li key={country.iso} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(country);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-start text-sm transition-colors hover:bg-rx-bg-subtle",
                    selected ? "text-rx-primary" : "text-rx-text"
                  )}
                >
                  <span className="text-base leading-none">{country.flag}</span>
                  <span className="flex-1 truncate">
                    {locale === "ar" ? country.nameAr : country.nameEn}
                  </span>
                  <span dir="ltr" className="text-xs text-rx-muted">
                    {country.dial}
                  </span>
                  {selected && <Check size={14} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
