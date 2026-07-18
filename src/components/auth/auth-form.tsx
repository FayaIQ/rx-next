"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn, signOut, getSession } from "next-auth/react";
import { toast } from "sonner";
import { Loader2, Phone, Lock, User, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

export function AuthForm({
  mode,
  role,
  title,
  subtitle,
  alternateHref,
  alternateLabel,
}: AuthFormProps) {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

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
      toast.info("انتهت الجلسة — سجّل الدخول مجدداً");
      // Ensure stale JWT is gone before the next login attempt.
      void signOut({ redirect: false });
    }
  }, [mode, searchParams]);

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
        const endpoint =
          role === "secretary"
            ? "/api/auth/secretary/register"
            : "/api/auth/register";

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, phone, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error ?? "فشل التسجيل");
          return;
        }
        toast.success("تم إنشاء الحساب بنجاح");
      }

      // Clear any previous JWT so a new login doesn't fight an old sessionId.
      await signOut({ redirect: false });

      const result = await signIn("credentials", {
        phone,
        password,
        role,
        redirect: false,
      });

      if (result?.error) {
        toast.error("بيانات الدخول غير صحيحة");
        return;
      }

      // Full navigation ensures session cookie is loaded before middleware runs
      window.location.href = await resolveCallbackUrl();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "حدث خطأ، حاول مرة أخرى"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-rx-text">{title}</h1>
        {subtitle && (
          <p className="mt-2 text-sm text-rx-muted">{subtitle}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {mode === "signup" && (
          <div className="space-y-2">
            <Label htmlFor="name">الاسم الكامل</Label>
            <div className="relative">
              <User className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-rx-muted" />
              <Input
                id="name"
                className="pr-10"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                placeholder="د. محمد أحمد"
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="phone">رقم الهاتف</Label>
          <div className="relative">
            <Phone className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-rx-muted" />
            <Input
              id="phone"
              type="tel"
              dir="ltr"
              className="pr-10 text-left"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09XXXXXXXX أو 07XXXXXXXXX"
              required
              autoComplete="tel"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">كلمة المرور</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-rx-muted" />
            <Input
              id="password"
              type="password"
              className="pr-10"
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
              جاري المعالجة...
            </>
          ) : mode === "signup" ? (
            "إنشاء حساب"
          ) : (
            "تسجيل الدخول"
          )}
        </Button>
      </form>

      {alternateHref && alternateLabel && (
        <p className="mt-6 text-center text-sm text-rx-muted">
          <Link
            href={alternateHref}
            className="inline-flex items-center gap-1 font-medium text-rx-primary hover:underline"
          >
            <ArrowLeft size={14} />
            {alternateLabel}
          </Link>
        </p>
      )}
    </div>
  );
}
