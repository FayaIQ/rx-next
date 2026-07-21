"use client";

import { useState } from "react";
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
import {
  normalizeSecretaryInviteCode,
  SECRETARY_INVITE_CODE_LENGTH,
} from "@/lib/secretary-invite";
import { useLocale } from "@/i18n/locale-provider";

export function SecretaryActivateClient() {
  const { t } = useLocale();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/secretary/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: normalizeSecretaryInviteCode(code) }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? t("secretary.invalidCode"));
        return;
      }
      toast.success(
        data.alreadyActivated
          ? t("secretary.alreadyActivated")
          : t("secretary.linkedSuccess")
      );
      window.location.assign("/secretary/desk");
    } catch {
      toast.error(t("secretary.genericError"));
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
          <CardTitle className="text-2xl">{t("secretary.activateTitle")}</CardTitle>
          <CardDescription>
            {t("secretary.activateDescription", {
              length: SECRETARY_INVITE_CODE_LENGTH,
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleActivate} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="code">{t("secretary.inviteCode")}</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) =>
                  setCode(normalizeSecretaryInviteCode(e.target.value))
                }
                maxLength={SECRETARY_INVITE_CODE_LENGTH}
                dir="ltr"
                className="text-center font-mono text-lg tracking-[0.35em]"
                placeholder={"X".repeat(SECRETARY_INVITE_CODE_LENGTH)}
                required
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading
                ? t("secretary.activating")
                : t("secretary.activateAccount")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthPageLayout>
  );
}
