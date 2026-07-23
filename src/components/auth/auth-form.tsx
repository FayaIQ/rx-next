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
  ShieldCheck,
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
  const [step, setStep] = useState<"form" | "otp">("form");
  const [otpCode, setOtpCode] = useState("");
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setInterval(
      () => setResendIn((s) => (s > 0 ? s - 1 : 0)),
      1000
    );
    return () => clearInterval(timer);
  }, [resendIn]);

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

  async function registerAccount(otpToken?: string): Promise<boolean> {
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
        ...(otpToken ? { otpToken } : {}),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? t("auth.registerFailed"));
      return false;
    }
    toast.success(t("auth.accountCreated"));
    return true;
  }

  async function finishSignIn(otpToken?: string): Promise<void> {
    await signOut({ redirect: false });

    const result = await signIn("credentials", {
      phone,
      password,
      role,
      ...(otpToken ? { otpToken } : {}),
      redirect: false,
    });

    if (result?.error) {
      toast.error(t("auth.invalidCredentials"));
      return;
    }

    window.location.href = await resolveCallbackUrl();
  }

  /** Returns "sent" when the OTP step should be shown, "disabled" when the
   *  server has no OTP key, "failed" on error. */
  async function requestOtp(): Promise<"sent" | "disabled" | "failed"> {
    const res = await fetch("/api/auth/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone,
        mode,
        ...(mode === "signin" ? { password } : {}),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? t("auth.otpSendFailed"));
      return "failed";
    }
    if (data.enabled === false) return "disabled";
    setResendIn(60);
    return "sent";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      if (mode === "signup" && role === "doctor" && !practiceType) {
        toast.error(t("auth.choosePractice"));
        return;
      }

      const otpStatus = await requestOtp();
      if (otpStatus === "failed") return;

      if (otpStatus === "sent") {
        setOtpCode("");
        setStep("otp");
        return;
      }

      // OTP not configured — legacy password-only flow.
      if (mode === "signup" && !(await registerAccount())) return;
      await finishSignIn();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("common.error")
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: otpCode }),
      });
      const data = await res.json();
      if (!res.ok || !data.otpToken) {
        toast.error(data.error ?? t("auth.otpInvalid"));
        return;
      }

      const otpToken = data.otpToken as string;
      if (mode === "signup" && !(await registerAccount(otpToken))) return;
      await finishSignIn(otpToken);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("common.error")
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (loading || resendIn > 0) return;
    setLoading(true);
    try {
      const status = await requestOtp();
      if (status === "sent") {
        setOtpCode("");
        toast.success(t("auth.otpResent"));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  const iconSide = locale === "ar" ? "right-3.5" : "left-3.5";
  const inputPad = locale === "ar" ? "pr-10" : "pl-10";
  const AltArrow = locale === "ar" ? ArrowLeft : ArrowRight;
  const BackArrow = locale === "ar" ? ArrowRight : ArrowLeft;

  if (step === "otp") {
    return (
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-end">
          <LanguageSwitcher variant="toggle" />
        </div>
        <div className="mb-8">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rx-primary/10 text-rx-primary">
            <ShieldCheck size={24} />
          </span>
          <h1 className="text-2xl font-bold text-rx-text">
            {t("auth.otpTitle")}
          </h1>
          <p className="mt-2 text-sm text-rx-muted" dir="auto">
            {t("auth.otpSentTo", { phone })}
          </p>
        </div>

        <form onSubmit={handleOtpSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="otp-code">{t("auth.otpCodeLabel")}</Label>
            <Input
              id="otp-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              dir="ltr"
              className="text-center text-lg font-semibold tracking-[0.5em]"
              value={otpCode}
              onChange={(e) =>
                setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="••••••"
              required
              minLength={4}
              autoFocus
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={loading || otpCode.length < 4}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {t("auth.otpVerifying")}
              </>
            ) : (
              t("auth.otpVerify")
            )}
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => {
              setStep("form");
              setOtpCode("");
            }}
            className="inline-flex items-center gap-1 font-medium text-rx-muted hover:text-rx-text"
          >
            <BackArrow size={14} />
            {t("auth.otpChangePhone")}
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={loading || resendIn > 0}
            className="font-medium text-rx-primary hover:underline disabled:cursor-not-allowed disabled:text-rx-muted disabled:no-underline"
          >
            {resendIn > 0
              ? t("auth.otpResendIn", { seconds: resendIn })
              : t("auth.otpResend")}
          </button>
        </div>
      </div>
    );
  }

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
