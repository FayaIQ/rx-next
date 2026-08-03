"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  KeyRound,
  Loader2,
  Lock,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CountryCodeSelect } from "@/components/auth/country-code-select";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import {
  composeInternationalPhone,
  type PhoneCountry,
} from "@/lib/phone-countries";
import { useLocale } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

type ResetStep = "phone" | "otp" | "password";

interface PasswordResetFlowProps {
  initialCountry: PhoneCountry;
  initialPhone: string;
  onBack: () => void;
  onComplete: (values: {
    country: PhoneCountry;
    phone: string;
    password: string;
  }) => void;
}

export function PasswordResetFlow({
  initialCountry,
  initialPhone,
  onBack,
  onComplete,
}: PasswordResetFlowProps) {
  const { t, locale } = useLocale();
  const [step, setStep] = useState<ResetStep>("phone");
  const [country, setCountry] = useState(initialCountry);
  const [phone, setPhone] = useState(initialPhone);
  const [otpCode, setOtpCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaProof, setCaptchaProof] = useState<string | null>(null);
  const [captchaNonce, setCaptchaNonce] = useState(0);

  const fullPhone = composeInternationalPhone(country.dial, phone);
  const iconSide = locale === "ar" ? "right-3.5" : "left-3.5";
  const inputPad = locale === "ar" ? "pr-10" : "pl-10";
  const BackArrow = locale === "ar" ? ArrowRight : ArrowLeft;

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setInterval(
      () => setResendIn((current) => Math.max(current - 1, 0)),
      1000
    );
    return () => clearInterval(timer);
  }, [resendIn]);

  function resetCaptcha() {
    if (!TURNSTILE_SITE_KEY) return;
    setCaptchaToken(null);
    setCaptchaNonce((current) => current + 1);
  }

  async function requestCode(): Promise<boolean> {
    if (TURNSTILE_SITE_KEY && !captchaToken && !captchaProof) {
      toast.error(t("auth.captchaRequired"));
      return false;
    }

    const response = await fetch("/api/auth/password-reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: fullPhone,
        ...(captchaToken ? { turnstileToken: captchaToken } : {}),
        ...(captchaProof ? { captchaProof } : {}),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      toast.error(data.error ?? t("auth.resetSendFailed"));
      resetCaptcha();
      return false;
    }

    if (data.captchaProof) setCaptchaProof(data.captchaProof as string);
    setResendIn(60);
    return true;
  }

  async function handlePhoneSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      if (!(await requestCode())) return;
      setOtpCode("");
      setStep("otp");
      toast.success(t("auth.resetCodeSent"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const response = await fetch("/api/auth/password-reset/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone, code: otpCode }),
      });
      const data = await response.json();
      if (!response.ok || !data.resetToken) {
        toast.error(data.error ?? t("auth.otpInvalid"));
        return;
      }

      setResetToken(data.resetToken as string);
      setPassword("");
      setPasswordConfirmation("");
      setStep("password");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    if (password !== passwordConfirmation) {
      toast.error(t("auth.passwordsDoNotMatch"));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: fullPhone,
          resetToken,
          password,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error ?? t("auth.resetFailed"));
        return;
      }

      toast.success(t("auth.passwordResetSuccess"));
      onComplete({ country, phone, password });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (loading || resendIn > 0) return;
    setLoading(true);
    try {
      if (await requestCode()) {
        setOtpCode("");
        toast.success(t("auth.otpResent"));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  const heading =
    step === "phone"
      ? t("auth.forgotPasswordTitle")
      : step === "otp"
        ? t("auth.resetOtpTitle")
        : t("auth.newPasswordTitle");
  const description =
    step === "phone"
      ? t("auth.forgotPasswordSubtitle")
      : step === "otp"
        ? t("auth.otpSentTo", { phone: fullPhone })
        : t("auth.newPasswordSubtitle");
  const HeadingIcon =
    step === "phone" ? KeyRound : step === "otp" ? ShieldCheck : Lock;

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 flex justify-end">
        <LanguageSwitcher variant="toggle" />
      </div>
      <div className="mb-8">
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rx-primary/10 text-rx-primary">
          <HeadingIcon size={24} />
        </span>
        <h1 className="text-2xl font-bold text-rx-text">{heading}</h1>
        <p className="mt-2 text-sm leading-6 text-rx-muted" dir="auto">
          {description}
        </p>
      </div>

      {step === "phone" && (
        <form onSubmit={handlePhoneSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="reset-phone">{t("auth.phone")}</Label>
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
                  id="reset-phone"
                  type="tel"
                  dir="ltr"
                  className={cn(inputPad, "text-left")}
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder={country.placeholder}
                  required
                  autoComplete="tel-national"
                  autoFocus
                />
              </div>
            </div>
          </div>

          {TURNSTILE_SITE_KEY && (
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
              loading || Boolean(TURNSTILE_SITE_KEY && !captchaToken)
            }
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {t("auth.resetSending")}
              </>
            ) : (
              t("auth.sendResetCode")
            )}
          </Button>
        </form>
      )}

      {step === "otp" && (
        <>
          <form onSubmit={handleOtpSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="reset-otp">{t("auth.otpCodeLabel")}</Label>
              <Input
                id="reset-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                dir="ltr"
                className="text-center text-lg font-semibold tracking-[0.5em]"
                value={otpCode}
                onChange={(event) =>
                  setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))
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
                setStep("phone");
                setOtpCode("");
                setCaptchaProof(null);
                resetCaptcha();
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
        </>
      )}

      {step === "password" && (
        <form onSubmit={handlePasswordSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="new-password">{t("auth.newPassword")}</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              autoComplete="new-password"
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">
              {t("auth.confirmPassword")}
            </Label>
            <Input
              id="confirm-password"
              type="password"
              value={passwordConfirmation}
              onChange={(event) =>
                setPasswordConfirmation(event.target.value)
              }
              minLength={8}
              autoComplete="new-password"
              required
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={
              loading ||
              password.length < 8 ||
              passwordConfirmation.length < 8
            }
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {t("auth.resettingPassword")}
              </>
            ) : (
              t("auth.saveNewPassword")
            )}
          </Button>
        </form>
      )}

      {step !== "otp" && (
        <button
          type="button"
          onClick={onBack}
          className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-rx-muted hover:text-rx-text"
        >
          <BackArrow size={14} />
          {t("auth.backToSignIn")}
        </button>
      )}
    </div>
  );
}
