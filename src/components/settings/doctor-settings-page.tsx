"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Copy,
  Plus,
  Save,
  Globe,
  UserRound,
  ListChecks,
  UserPlus,
  KeyRound,
} from "lucide-react";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { PageContent } from "@/components/ui/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { FormPageLoading } from "@/components/ui/page-loading";
import { PatientFieldsManager } from "@/components/settings/patient-fields-manager";
import { queryKeys } from "@/lib/query-keys";
import { rxApi } from "@/lib/api/rx-client";
import { useLocale, type Locale } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";

type SettingsTab = "account" | "fields" | "invites" | "language";

const TABS: Array<{
  id: SettingsTab;
  label: string;
  icon: typeof UserRound;
}> = [
  { id: "account", label: "الحساب", icon: UserRound },
  { id: "fields", label: "الحقول", icon: ListChecks },
  { id: "invites", label: "السكرتير", icon: UserPlus },
  { id: "language", label: "اللغة", icon: Globe },
];

function InviteRow({
  code,
  used,
  expiresAt,
}: {
  code: string;
  used: boolean;
  expiresAt: string | null;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-rx-border bg-rx-surface p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xl font-bold tracking-wide text-rx-text">
            {code}
          </span>
          <Badge variant={used ? "secondary" : "success"}>
            {used ? "مستخدم" : "متاح"}
          </Badge>
        </div>
        {!used && expiresAt && (
          <p className="text-xs text-rx-muted">
            ينتهي: {new Date(expiresAt).toLocaleDateString("ar-SY")}
          </p>
        )}
      </div>
      {!used && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            void navigator.clipboard.writeText(code);
            toast.success("تم نسخ رمز الدعوة");
          }}
        >
          <Copy size={14} />
          نسخ الرمز
        </Button>
      )}
    </div>
  );
}

export function DoctorSettingsPage() {
  const queryClient = useQueryClient();
  const { locale, setLocale, t } = useLocale();
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");
  const [profile, setProfile] = useState({
    name: "",
    phoneNumber: "",
    currentPassword: "",
    newPassword: "",
  });

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => rxApi.settings.getProfile(),
  });

  const { data: fieldsData, isLoading: fieldsLoading } = useQuery({
    queryKey: queryKeys.fieldsAll.all,
    queryFn: () => rxApi.fields.listAll(),
  });

  const { data: invitesData, isLoading: invitesLoading } = useQuery({
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
        ...(profile.newPassword
          ? {
              currentPassword: profile.currentPassword,
              newPassword: profile.newPassword,
            }
          : {}),
      }),
    onSuccess: () => {
      toast.success("تم حفظ بيانات الحساب");
      setProfile((p) => ({ ...p, currentPassword: "", newPassword: "" }));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createInvite = useMutation({
    mutationFn: () => rxApi.settings.createInvite(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secretary-invites"] });
      toast.success("تم إنشاء رمز دعوة جديد");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const fields = fieldsData?.fields ?? [];
  const invites = invitesData?.invites ?? [];
  const activeInvites = invites.filter((i) => !i.used);

  const isInitialLoading =
    profileLoading && !profileData && fieldsLoading && invitesLoading;

  if (isInitialLoading) {
    return <FormPageLoading />;
  }

  return (
    <>
      <AppHeader
        title="الإعدادات"
        subtitle="إدارة حسابك وحقول المرضى والسكرتارية"
        actions={
          activeTab === "account" ? (
            <Button
              size="sm"
              onClick={() => saveProfile.mutate()}
              disabled={saveProfile.isPending || !profile.name.trim()}
            >
              <Save size={15} />
              {saveProfile.isPending ? "جاري الحفظ..." : "حفظ الحساب"}
            </Button>
          ) : undefined
        }
      />

      <PageContent className={cn("space-y-4", activeTab === "account" && "pb-24 xl:pb-8")}>
        <div className="sticky top-[var(--rx-header-height)] z-20 -mx-1 overflow-x-auto px-1 pb-1">
          <div className="flex min-w-max gap-1.5 rounded-2xl border border-rx-border bg-rx-surface p-1.5 shadow-sm">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  activeTab === id
                    ? "bg-rx-primary text-white shadow-sm"
                    : "text-rx-muted hover:bg-rx-bg-subtle hover:text-rx-text"
                )}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "account" && (
          <div className="mx-auto max-w-2xl space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">البيانات الشخصية</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {profileLoading ? (
                  <>
                    <Skeleton className="h-10 w-full rounded-xl" />
                    <Skeleton className="h-10 w-full rounded-xl" />
                  </>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label>الاسم</Label>
                      <Input
                        value={profile.name}
                        onChange={(e) =>
                          setProfile((p) => ({ ...p, name: e.target.value }))
                        }
                        placeholder="د. أحمد محمد"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>رقم تسجيل الدخول</Label>
                      <Input
                        dir="ltr"
                        value={profile.phoneNumber}
                        readOnly
                        disabled
                        className="bg-rx-bg-subtle text-rx-muted"
                      />
                      <p className="text-xs text-rx-muted">
                        رقم الهاتف ثابت ويُستخدم لتسجيل الدخول — لا يمكن تغييره
                        من الإعدادات.
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <KeyRound size={17} />
                  تغيير كلمة المرور
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <p className="text-sm text-rx-muted">
                  اترك الحقول فارغة إذا لا تريد تغيير كلمة المرور.
                </p>
                <div className="space-y-1.5">
                  <Label>كلمة المرور الحالية</Label>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    value={profile.currentPassword}
                    onChange={(e) =>
                      setProfile((p) => ({
                        ...p,
                        currentPassword: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>كلمة المرور الجديدة</Label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={profile.newPassword}
                    onChange={(e) =>
                      setProfile((p) => ({
                        ...p,
                        newPassword: e.target.value,
                      }))
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "fields" && (
          <div className="space-y-4">
            <div className="rounded-xl bg-rx-primary-light/50 px-4 py-3 text-sm text-rx-text-secondary">
              الحقول الأساسية (الاسم، الجنس، العمر) تُضبط من{" "}
              <Link href="/recipe-settings" className="font-medium text-rx-primary hover:underline">
                تصميم الوصفة
              </Link>
              . هنا تُدار الحقول الإضافية للمريض والوصفة.
            </div>
            {fieldsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-64 w-full rounded-2xl" />
                <Skeleton className="h-64 w-full rounded-2xl" />
              </div>
            ) : (
              <PatientFieldsManager fields={fields} />
            )}
          </div>
        )}

        {activeTab === "invites" && (
          <Card className="mx-auto max-w-2xl">
            <CardHeader className="flex flex-col gap-3 border-b border-rx-border/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">دعوات السكرتير</CardTitle>
                <p className="mt-1 text-sm text-rx-muted">
                  أنشئ رمزاً وشاركه مع السكرتير للتسجيل في عيادتك
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => createInvite.mutate()}
                disabled={createInvite.isPending}
              >
                <Plus size={15} />
                رمز جديد
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {invitesLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-xl" />
                  ))}
                </div>
              ) : invites.length === 0 ? (
                <EmptyState
                  icon={UserPlus}
                  title="لا توجد دعوات"
                  description="أنشئ رمز دعوة وشاركه مع السكرتير لربطه بحسابك"
                  action={
                    <Button
                      onClick={() => createInvite.mutate()}
                      disabled={createInvite.isPending}
                    >
                      <Plus size={16} />
                      إنشاء رمز
                    </Button>
                  }
                />
              ) : (
                <>
                  {activeInvites.length > 0 && (
                    <p className="text-xs text-rx-muted">
                      {activeInvites.length} رمز متاح للاستخدام
                    </p>
                  )}
                  <div className="space-y-2">
                    {invites.map((invite) => (
                      <InviteRow
                        key={invite.id}
                        code={invite.code}
                        used={invite.used}
                        expiresAt={invite.expiresAt}
                      />
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "language" && (
          <Card className="mx-auto max-w-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe size={17} />
                {t.language}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-rx-muted">
                اختر لغة واجهة التطبيق. التغيير فوري ويُحفظ على هذا الجهاز.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ["ar", "العربية"],
                    ["en", "English"],
                  ] as const
                ).map(([code, label]) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLocale(code as Locale)}
                    className={cn(
                      "rounded-xl border px-4 py-3 text-sm font-medium transition-all",
                      locale === code
                        ? "border-rx-primary bg-rx-primary-light text-rx-primary shadow-sm"
                        : "border-rx-border bg-rx-surface text-rx-text-secondary hover:border-rx-primary/30 hover:bg-rx-bg-subtle"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "account" && (
          <div className="fixed inset-x-0 bottom-[var(--rx-nav-pill-offset)] z-20 border-t border-rx-border bg-rx-surface/95 p-3 backdrop-blur-sm xl:hidden">
            <Button
              className="w-full"
              onClick={() => saveProfile.mutate()}
              disabled={saveProfile.isPending || !profile.name.trim()}
            >
              <Save size={16} />
              {saveProfile.isPending ? "جاري الحفظ..." : "حفظ الحساب"}
            </Button>
          </div>
        )}
      </PageContent>
    </>
  );
}
