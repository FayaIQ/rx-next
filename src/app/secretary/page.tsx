"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { AuthPageLayout } from "@/components/auth/auth-page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SecretaryWelcomePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/secretary/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "رمز غير صالح");
        return;
      }
      toast.success("تم ربط حسابك بالطبيب بنجاح");
      router.push("/secretary/patients");
      router.refresh();
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPageLayout role="secretary">
      <Card className="border-0 shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
            <KeyRound size={28} />
          </div>
          <CardTitle className="text-2xl">تفعيل حساب السكرتير</CardTitle>
          <CardDescription>
            أدخل رمز الدعوة المكوّن من 16 حرفاً الذي أرسله لك الطبيب
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleActivate} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="code">رمز الدعوة</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={16}
                dir="ltr"
                className="text-center font-mono text-lg tracking-[0.3em]"
                placeholder="XXXXXXXXXXXXXXXX"
                required
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "جاري التفعيل..." : "تفعيل الحساب"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthPageLayout>
  );
}
