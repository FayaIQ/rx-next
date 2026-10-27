"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
} from "@/lib/doctor-practice-shared";
import { cn } from "@/lib/utils";
import { useLocale } from "@/i18n/locale-provider";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";
import { CountryCodeSelect } from "@/components/auth/country-code-select";
import { PasswordResetFlow } from "@/components/auth/password-reset-flow";
import {
  DEFAULT_PHONE_COUNTRY,
  composeInternationalPhone,
  type PhoneCountry,
} from "@/lib/phone-countries";
import { isDevTestDoctorPhone } from "@/lib/dev-test-doctor";
import { trackTrialSignup } from "@/lib/google-ads";
import { trackMetaEvent } from "@/lib/meta-pixel";
import { trackAnalyticsEvent, type AnalyticsEvent } from "@/lib/analytics";
import { readAcquisition, productVisitKey } from "@/lib/product-analytics/shared";
import { readApiResponse } from "@/lib/api/read-response";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

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
  const submitLock = useRef(false);
  const signupStarted = useRef(false);
  const createdCredentials = useRef<{ phone: string; password: string } | null>(null);

  function trackSignupStarted() {
    if (mode !== "signup" || signupStarted.current) return;
    signupStarted.current = true;
    trackSignupEvent("signup_started");
  }
  const [accountCreated, setAccountCreated] = useState(false);
  const [name, setName] = useState("");
  const [country, setCountry] = useState<PhoneCountry>(DEFAULT_PHONE_COUNTRY);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  // Full international number (+9647xx…) sent to every endpoint.
  const fullPhone = composeInternationalPhone(country.dial, phone);
  const isDevTestDoctor =
    mode === "signup" &&
    role === "doctor" &&
    isDevTestDoctorPhone(fullPhone);
  const [practiceType, setPracticeType] =
    useState<DoctorPracticeType>(searchParams.get("practice") === "dental" ? "dental" : "general");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  // Remounts the widget — Turnstile tokens are single-use.
  const [captchaNonce, setCaptchaNonce] = useState(0);
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  function trackSignupEvent(event: AnalyticsEvent) {
    if (isDevTestDoctor) return;
    trackAnalyticsEvent(event, { role, ...(role === "doctor" ? { practiceType } : {}) });
  }

  function resetCaptcha() {
    if (!TURNSTILE_SITE_KEY) return;
    setCaptchaToken(null);
    setCaptchaNonce((n) => n + 1);
  }

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
    if (searchParams.get("accountDeleted") === "1") {
      toast.success(t("auth.accountDeleted"));
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
    if (mode === "signup" && role === "doctor") return "/onboarding";

    const session = await getSession();
    if (session?.user?.type === "admin") return "/dashboard";
    if (session?.user?.type === "secretary") return "/secretary";
    return fromQuery === "/dashboard" ? "/home" : fromQuery;
  }

  async function registerAccount(): Promise<boolean> {
    const endpoint =
      role === "secretary"
        ? "/api/auth/secretary/register"
        : "/api/auth/register";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        phone: fullPhone,
        password,
        ...(role === "doctor" ? { practiceType, acquisition: { ...readAcquisition(), visitKey: productVisitKey() } } : {}),
        ...(captchaToken ? { turnstileToken: captchaToken } : {}),
      }),
    });
    const data = await readApiResponse<{ error?: string }>(
      res,
      t("auth.serverUnavailable")
    );
    if (!res.ok) {
      trackSignupEvent("signup_failed");
      toast.error(data.error ?? t("auth.registerFailed"));
      return false;
    }
    if (role === "doctor" && !isDevTestDoctor) {
      trackTrialSignup();
      trackMetaEvent("CompleteRegistration");
    }
    createdCredentials.current = { phone: fullPhone, password };
    setAccountCreated(true);
    trackSignupEvent("account_created");
    toast.success(t("auth.accountCreated"));
    return true;
  }

  async function finishSignIn(): Promise<void> {
    await signOut({ redirect: false });

    const result = await signIn("credentials", {
      phone: createdCredentials.current?.phone ?? fullPhone,
      password: createdCredentials.current?.password ?? password,
      role,
      redirect: false,
    });

    if (!result?.ok || result.error) {
      if (mode === "signup") trackSignupEvent("signin_failed");
      toast.error(t("auth.invalidCredentials"));
      return;
    }

    if (mode === "signup" && createdCredentials.current) trackSignupEvent("first_signin_success");
    window.location.href = await resolveCallbackUrl();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitLock.current) return;
    submitLock.current = true;
    setLoading(true);

    try {
      if (mode === "signin" || createdCredentials.current) {
        await finishSignIn();
        return;
      }

      if (mode === "signup" && role === "doctor" && !practiceType) {
        toast.error(t("auth.choosePractice"));
        return;
      }

      if (TURNSTILE_SITE_KEY && !captchaToken && !isDevTestDoctor) {
        toast.error(t("auth.captchaRequired"));
        return;
      }

      if (!(await registerAccount())) {
        resetCaptcha();
        return;
      }
      await finishSignIn();
    } catch (err) {
      if (mode === "signup") {
        trackSignupEvent(createdCredentials.current ? "signin_failed" : "signup_failed");
        if (!createdCredentials.current) resetCaptcha();
      }
      toast.error(
        err instanceof Error ? err.message : t("common.error")
      );
    } finally {
      submitLock.current = false;
      setLoading(false);
    }
  }

  const iconSide = locale === "ar" ? "right-3.5" : "left-3.5";
  const inputPad = locale === "ar" ? "pr-10" : "pl-10";
  const AltArrow = locale === "ar" ? ArrowLeft : ArrowRight;

  if (showPasswordReset) {
    return (
      <PasswordResetFlow
        initialCountry={country}
        initialPhone={phone}
        onBack={() => setShowPasswordReset(false)}
        onComplete={(values) => {
          setCountry(values.country);
          setPhone(values.phone);
          setPassword(values.password);
          setShowPasswordReset(false);
        }}
      />
    );
  }

  if (accountCreated) {
    return (
      <div className="w-full space-y-5">
        <h1 className="text-2xl font-bold text-rx-text">{t("auth.accountCreated")}</h1>
        <p className="text-sm text-rx-muted">{locale === "ar" ? "تم إنشاء حسابك. سجّل الدخول للمتابعة." : "Your account is ready. Sign in to continue."}</p>
        <form onSubmit={handleSubmit}>
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? <><Loader2 size={18} className="animate-spin" />{t("auth.signingIn")}</> : t("auth.signIn")}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-rx-text">{title}</h1>
        {subtitle && (
          <p className="mt-2 text-sm text-rx-muted">{subtitle}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} onFocusCapture={trackSignupStarted} className="space-y-5">
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
          <div className="flex gap-2" dir="ltr">
            <CountryCodeSelect
              value={country}
              onChange={setCountry}
              locale={locale}
              label={t("auth.countryCode")}
            />
            <div className="relative flex-1">
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
                placeholder={country.placeholder}
                required
                autoComplete="tel-national"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="password">{t("auth.password")}</Label>
            {mode === "signin" && (
              <button
                type="button"
                onClick={() => {
                  setPassword("");
                  setShowPasswordReset(true);
                }}
                className="text-xs font-medium text-rx-primary hover:underline"
              >
                {t("auth.forgotPassword")}
              </button>
            )}
          </div>
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

        {mode === "signup" && TURNSTILE_SITE_KEY && !isDevTestDoctor && (
          <TurnstileWidget
            key={captchaNonce}
            siteKey={TURNSTILE_SITE_KEY}
            locale={locale}
            onToken={setCaptchaToken}
          />
        )}

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={
            loading ||
            Boolean(
              mode === "signup" && TURNSTILE_SITE_KEY && !captchaToken
                && !isDevTestDoctor
            )
          }
        >
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
