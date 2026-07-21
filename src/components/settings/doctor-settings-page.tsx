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
import { useLocale, type TranslateFn } from "@/i18n/locale-provider";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { cn } from "@/lib/utils";

type SettingsTab = "account" | "fields" | "invites" | "language";

const TAB_DEFS: Array<{
  id: SettingsTab;
  labelKey: string;
  icon: typeof UserRound;
}> = [
  { id: "account", labelKey: "settings.tabAccount", icon: UserRound },
  { id: "fields", labelKey: "settings.tabFields", icon: ListChecks },
  { id: "invites", labelKey: "settings.tabInvites", icon: UserPlus },
  { id: "language", labelKey: "settings.tabLanguage", icon: Globe },
];

function InviteRow({
  code,
  used,
  expiresAt,
  t,
  locale,
}: {
  code: string;
  used: boolean;
  expiresAt: string | null;
  t: TranslateFn;
  locale: string;
}) {
  const dateLocale = locale === "ar" ? "ar-IQ" : "en-GB";
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-rx-border bg-rx-surface p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xl font-bold tracking-wide text-rx-text">
            {code}
          </span>
          <Badge variant={used ? "secondary" : "success"}>
            {used ? t("settings.inviteUsed") : t("settings.inviteAvailable")}
          </Badge>
        </div>
        {!used && expiresAt && (
          <p className="text-xs text-rx-muted">
            {t("settings.inviteExpires", {
              date: new Date(expiresAt).toLocaleDateString(dateLocale),
            })}
          </p>
        )}
      </div>
      {!used && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            void navigator.clipboard.writeText(code);
            toast.success(t("settings.inviteCopied"));
          }}
        >
          <Copy size={14} />
          {t("settings.copyCode")}
        </Button>
      )}
    </div>
  );
}

export function DoctorSettingsPage() {
  const queryClient = useQueryClient();
  const { locale, t } = useLocale();
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
      toast.success(t("settings.profileSaved"));
      setProfile((p) => ({ ...p, currentPassword: "", newPassword: "" }));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createInvite = useMutation({
    mutationFn: () => rxApi.settings.createInvite(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secretary-invites"] });
      toast.success(t("settings.inviteCreated"));
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
        title={t("settings.title")}
        subtitle={t("settings.subtitle")}
        actions={
          activeTab === "account" ? (
            <Button
              size="sm"
              onClick={() => saveProfile.mutate()}
              disabled={saveProfile.isPending || !profile.name.trim()}
            >
              <Save size={15} />
              {saveProfile.isPending
                ? t("common.saving")
                : t("settings.saveAccount")}
            </Button>
          ) : undefined
        }
      />

      <PageContent className={cn("space-y-4", activeTab === "account" && "pb-24 xl:pb-8")}>
        <div className="sticky top-[var(--rx-header-height)] z-20 -mx-1 overflow-x-auto px-1 pb-1">
          <div className="flex min-w-max gap-1.5 rounded-2xl border border-rx-border bg-rx-surface p-1.5 shadow-sm">
            {TAB_DEFS.map(({ id, labelKey, icon: Icon }) => (
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
                {t(labelKey)}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "account" && (
          <div className="mx-auto max-w-2xl space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {t("settings.personalData")}
                </CardTitle>
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
                      <Label>{t("settings.name")}</Label>
                      <Input
                        value={profile.name}
                        onChange={(e) =>
                          setProfile((p) => ({ ...p, name: e.target.value }))
                        }
                        placeholder={t("settings.namePlaceholder")}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("settings.loginNumber")}</Label>
                      <Input
                        dir="ltr"
                        value={profile.phoneNumber}
                        readOnly
                        disabled
                        className="bg-rx-bg-subtle text-rx-muted"
                      />
                      <p className="text-xs text-rx-muted">
                        {t("settings.phoneFixedHint")}
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
                  {t("settings.changePassword")}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <p className="text-sm text-rx-muted">
                  {t("settings.passwordLeaveBlank")}
                </p>
                <div className="space-y-1.5">
                  <Label>{t("settings.currentPassword")}</Label>
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
                  <Label>{t("settings.newPassword")}</Label>
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
              {t("settings.fieldsCoreHintBefore")}{" "}
              <Link href="/recipe-settings" className="font-medium text-rx-primary hover:underline">
                {t("settings.recipeDesign")}
              </Link>
              {t("settings.fieldsCoreHintAfter")}
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
                <CardTitle className="text-base">
                  {t("settings.secretaryInvites")}
                </CardTitle>
                <p className="mt-1 text-sm text-rx-muted">
                  {t("settings.secretaryInvitesHint")}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => createInvite.mutate()}
                disabled={createInvite.isPending}
              >
                <Plus size={15} />
                {t("settings.newCode")}
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
                  title={t("settings.noInvites")}
                  description={t("settings.noInvitesDesc")}
                  action={
                    <Button
                      onClick={() => createInvite.mutate()}
                      disabled={createInvite.isPending}
                    >
                      <Plus size={16} />
                      {t("settings.createCode")}
                    </Button>
                  }
                />
              ) : (
                <>
                  {activeInvites.length > 0 && (
                    <p className="text-xs text-rx-muted">
                      {t("settings.activeCodes", {
                        count: activeInvites.length,
                      })}
                    </p>
                  )}
                  <div className="space-y-2">
                    {invites.map((invite) => (
                      <InviteRow
                        key={invite.id}
                        code={invite.code}
                        used={invite.used}
                        expiresAt={invite.expiresAt}
                        t={t}
                        locale={locale}
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
                {t("settings.languageTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-rx-muted">{t("settings.languageHint")}</p>
              <LanguageSwitcher variant="full" />
              <p className="text-xs text-rx-muted">
                {locale === "ar" ? t("common.arabic") : t("common.english")}
              </p>
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
              {saveProfile.isPending
                ? t("common.saving")
                : t("settings.saveAccount")}
            </Button>
          </div>
        )}
      </PageContent>
    </>
  );
}
