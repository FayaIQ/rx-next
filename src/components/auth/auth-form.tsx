"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
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


export function AuthForm({
  mode,
  role,
  title,
  subtitle,
  alternateHref,
  alternateLabel,
}: AuthFormProps) {
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

  async function resolveCallbackUrl(): Promise<string> {
    if (role !== "doctor") return defaultCallbackUrl;

    const session = await getSession();
    if (session?.user?.type === "admin") return "/dashboard";
    if (session?.user?.type === "secretary") return "/secretary";
    return "/home";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
