"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Plus, Save, Globe } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { PageContent } from "@/components/ui/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PatientFieldsManager } from "@/components/settings/patient-fields-manager";
import { rxApi } from "@/lib/api/rx-client";
import { useLocale, type Locale } from "@/i18n/locale-provider";

export function DoctorSettingsPage() {
  const queryClient = useQueryClient();
  const { locale, setLocale, t } = useLocale();
  const [profile, setProfile] = useState({
    name: "",
    phoneNumber: "",
    currentPassword: "",
    newPassword: "",
  });

  const { data: profileData } = useQuery({
    queryKey: ["profile"],
    queryFn: () => rxApi.settings.getProfile(),
  });

  const { data: fieldsData } = useQuery({
    queryKey: ["fields-all"],
    queryFn: () => rxApi.fields.listAll(),
  });

  const { data: invitesData } = useQuery({
    queryKey: ["secretary-invites"],
    queryFn: () => rxApi.settings.listInvites(),
  });

  useEffect(() => {
    if (profileData?.profile) {
      setProfile((p) => ({
        ...p,
        name: profileData.profile.name,
        phoneNumber: profileData.profile.phoneNumber,
      }));
    }
  }, [profileData]);

  const saveProfile = useMutation({
    mutationFn: () =>
      rxApi.settings.updateProfile({
        name: profile.name,
        phoneNumber: profile.phoneNumber,
        ...(profile.newPassword
          ? {
              currentPassword: profile.currentPassword,
              newPassword: profile.newPassword,
            }
          : {}),
      }),
    onSuccess: () => {
      toast.success("تم حفظ الحساب");
      setProfile((p) => ({ ...p, currentPassword: "", newPassword: "" }));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createInvite = useMutation({
    mutationFn: () => rxApi.settings.createInvite(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secretary-invites"] });
      toast.success("تم إنشاء رمز الدعوة");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const fields = fieldsData?.fields ?? [];
  const invites = invitesData?.invites ?? [];

  return (
    <>
      <AppHeader title="الإعدادات" subtitle="حسابك وحقول المرضى والدعوات" />
      <PageContent className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">حساب الطبيب</CardTitle>
          </CardHeader>
          <CardContent className="grid max-w-xl gap-3">
            <div className="space-y-1">
              <Label>الاسم</Label>
              <Input
                value={profile.name}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>رقم الهاتف</Label>
              <Input
                value={profile.phoneNumber}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, phoneNumber: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>كلمة المرور الحالية</Label>
              <Input
                type="password"
                value={profile.currentPassword}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, currentPassword: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>كلمة مرور جديدة</Label>
              <Input
                type="password"
                value={profile.newPassword}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, newPassword: e.target.value }))
                }
              />
            </div>
            <Button
              onClick={() => saveProfile.mutate()}
              disabled={saveProfile.isPending}
            >
              <Save size={16} />
              حفظ الحساب
            </Button>
          </CardContent>
        </Card>

        <PatientFieldsManager fields={fields} />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">دعوات السكرتير</CardTitle>
            <Button
              size="sm"
              onClick={() => createInvite.mutate()}
              disabled={createInvite.isPending}
            >
              <Plus size={16} />
              رمز جديد
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
              >
                <div>
                  <span className="font-mono text-lg font-bold">{invite.code}</span>
                  <span className="mx-2 text-rx-muted">
                    {invite.used
                      ? "— مستخدم"
                      : invite.expiresAt
                        ? `— ينتهي ${new Date(invite.expiresAt).toLocaleDateString("ar-SY")}`
                        : ""}
                  </span>
                </div>
                {!invite.used && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      navigator.clipboard.writeText(invite.code);
                      toast.success("تم نسخ الرمز");
                    }}
                  >
                    <Copy size={14} />
                    نسخ
                  </Button>
                )}
              </div>
            ))}
            {invites.length === 0 && (
              <p className="text-sm text-rx-muted">
                أنشئ رمزاً وشاركه مع السكرتير للتسجيل
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe size={18} />
              {t.language}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            {(
              [
                ["ar", "العربية"],
                ["en", "English"],
              ] as const
            ).map(([code, label]) => (
              <Button
                key={code}
                size="sm"
                variant={locale === code ? "default" : "secondary"}
                onClick={() => setLocale(code as Locale)}
              >
                {label}
              </Button>
            ))}
          </CardContent>
        </Card>
      </PageContent>
    </>
  );
}
