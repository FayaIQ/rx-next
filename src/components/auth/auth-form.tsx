"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn, signOut, getSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Loader2,
  Phone,
  Lock,
  User,
  ArrowLeft,
  ArrowRight,
  Stethoscope,
  Smile,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DOCTOR_PRACTICE_TYPES,
  type DoctorPracticeType,
} from "@/lib/doctor-practice";
import { cn } from "@/lib/utils";
import { useLocale } from "@/i18n/locale-provider";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

interface AuthFormProps {
  mode: "signin" | "signup";
  role: "doctor" | "secretary" | "admin";
  title: string;
  subtitle?: string;
  alternateHref?: string;
  alternateLabel?: string;
}

function safeCallbackUrl(raw: string | null | undefined, fallback: string) {
  if (!raw) return fallback;
  try {
    const path = raw.startsWith("http") ? new URL(raw).pathname : raw;
    if (!path.startsWith("/") || path.startsWith("//")) return fallback;
    if (path.startsWith("/api/") || path.startsWith("/_next/")) return fallback;
    if (path.startsWith("/auth/")) return fallback;
    return path;
  } catch {
    return fallback;
  }
}

const PRACTICE_ICONS: Record<DoctorPracticeType, typeof Stethoscope> = {
  general: Stethoscope,
  dental: Smile,
};

const PRACTICE_LABEL_KEYS: Record<
  DoctorPracticeType,
  { label: string; desc: string }
> = {
  general: {
    label: "auth.practiceGeneral",
    desc: "auth.practiceGeneralDesc",
  },
  dental: {
    label: "auth.practiceDental",
    desc: "auth.practiceDentalDesc",
  },
};

export function AuthForm({
  mode,
  role,
  title,
  subtitle,
  alternateHref,
  alternateLabel,
}: AuthFormProps) {
  const searchParams = useSearchParams();
  const { t, locale } = useLocale();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [practiceType, setPracticeType] =
    useState<DoctorPracticeType>("general");

  const defaultCallbackUrl =
    role === "admin"
      ? "/dashboard"
      : role === "secretary"
        ? "/secretary"
        : "/home";

  useEffect(() => {
    if (mode !== "signin") return;
    const error = searchParams.get("error");
    if (error === "session_expired") {
      toast.info(t("auth.sessionExpired"));
      void signOut({ redirect: false });
    }
  }, [mode, searchParams, t]);

  async function resolveCallbackUrl(): Promise<string> {
    const fromQuery = safeCallbackUrl(
      searchParams.get("callbackUrl"),
      defaultCallbackUrl
    );

    if (role === "secretary") {
      const session = await getSession();
      if (session?.user?.isConfirmed) return "/secretary/desk";
      return "/secretary";
    }
    if (role === "admin") return "/dashboard";

    const session = await getSession();
    if (session?.user?.type === "admin") return "/dashboard";
    if (session?.user?.type === "secretary") return "/secretary";
    return fromQuery === "/dashboard" ? "/home" : fromQuery;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      if (mode === "signup") {
        if (role === "doctor" && !practiceType) {
          toast.error(t("auth.choosePractice"));
          return;
        }

        const endpoint =
          role === "secretary"
            ? "/api/auth/secretary/register"
            : "/api/auth/register";

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            phone,
            password,
            ...(role === "doctor" ? { practiceType } : {}),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error ?? t("auth.registerFailed"));
          return;
        }
        toast.success(t("auth.accountCreated"));
      }

      await signOut({ redirect: false });

      const result = await signIn("credentials", {
        phone,
        password,
        role,
        redirect: false,
      });

      if (result?.error) {
        toast.error(t("auth.invalidCredentials"));
        return;
      }

      window.location.href = await resolveCallbackUrl();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("common.error")
      );
    } finally {
      setLoading(false);
    }
  }

  const iconSide = locale === "ar" ? "right-3.5" : "left-3.5";
  const inputPad = locale === "ar" ? "pr-10" : "pl-10";
  const AltArrow = locale === "ar" ? ArrowLeft : ArrowRight;

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 flex justify-end">
        <LanguageSwitcher variant="toggle" />
      </div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-rx-text">{title}</h1>
        {subtitle && (
          <p className="mt-2 text-sm text-rx-muted">{subtitle}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {mode === "signup" && (
          <div className="space-y-2">
            <Label htmlFor="name">{t("auth.fullName")}</Label>
            <div className="relative">
              <User
                className={cn(
                  "pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-rx-muted",
                  iconSide
                )}
              />
              <Input
                id="name"
                className={inputPad}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                placeholder={t("auth.namePlaceholder")}
              />
            </div>
          </div>
        )}

        {mode === "signup" && role === "doctor" ? (
          <div className="space-y-2">
            <Label>{t("auth.practiceType")}</Label>
            <p className="text-xs text-rx-muted">{t("auth.practiceHint")}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {DOCTOR_PRACTICE_TYPES.map((type) => {
                const Icon = PRACTICE_ICONS[type.id];
                const selected = practiceType === type.id;
                const keys = PRACTICE_LABEL_KEYS[type.id];
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setPracticeType(type.id)}
                    className={cn(
                      "rounded-xl border p-3 text-start transition",
                      selected
                        ? "border-rx-primary bg-rx-primary/5 ring-1 ring-rx-primary"
                        : "border-rx-border hover:border-rx-primary/40"
                    )}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg",
                          selected
                            ? "bg-rx-primary text-white"
                            : "bg-rx-bg-subtle text-rx-muted"
                        )}
                      >
                        <Icon size={16} />
                      </span>
                      <span className="text-sm font-semibold text-rx-text">
                        {t(keys.label)}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-rx-muted">
                      {t(keys.desc)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="phone">{t("auth.phone")}</Label>
          <div className="relative">
            <Phone
              className={cn(
                "pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-rx-muted",
                iconSide
              )}
            />
            <Input
              id="phone"
              type="tel"
              dir="ltr"
              className={cn(inputPad, "text-left")}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("auth.phonePlaceholder")}
              required
              autoComplete="tel"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{t("auth.password")}</Label>
          <div className="relative">
            <Lock
              className={cn(
                "pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-rx-muted",
                iconSide
              )}
            />
            <Input
              id="password"
              type="password"
              className={inputPad}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === "signup" && role === "doctor" ? 8 : 6}
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              placeholder="••••••••"
            />
          </div>
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              {mode === "signup" ? t("auth.creating") : t("auth.signingIn")}
            </>
          ) : mode === "signup" ? (
            t("auth.signUp")
          ) : (
            t("auth.signIn")
          )}
        </Button>
      </form>

      {alternateHref && alternateLabel && (
        <p className="mt-6 text-center text-sm text-rx-muted">
          <Link
            href={alternateHref}
            className="inline-flex items-center gap-1 font-medium text-rx-primary hover:underline"
          >
            <AltArrow size={14} />
            {alternateLabel}
          </Link>
        </p>
      )}
    </div>
  );
}
