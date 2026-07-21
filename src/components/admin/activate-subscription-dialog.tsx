"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { adminApi, type AdminUserDto, type AdminPackageDto } from "@/lib/api/admin-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/i18n/locale-provider";

export function ActivateSubscriptionDialog({
  user,
  onClose,
}: {
  user: AdminUserDto;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [packageId, setPackageId] = useState<number | "">("");
  const [customDays, setCustomDays] = useState("");
  const [notes, setNotes] = useState("");

  const { data: packagesData } = useQuery({
    queryKey: ["admin-packages"],
    queryFn: () => adminApi.packages(),
  });

  const packages = (packagesData?.packages ?? []).filter((p) => p.isActive);

  const activateMutation = useMutation({
    mutationFn: () => {
      if (packageId) {
        return adminApi.activateSubscription(user.id, {
          packageId: Number(packageId),
          notes: notes || null,
        });
      }
      const days = Number(customDays);
      if (!days || days < 1) throw new Error(t("admin.invalidDays"));
      return adminApi.activateSubscription(user.id, {
        duration: days,
        durationUnit: "days",
        notes: notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-doctors"] });
      toast.success(t("admin.activated", { name: user.name }));
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("admin.activateTitle", { name: user.name })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>{t("admin.choosePackage")}</Label>
            <select
              className="h-10 w-full rounded-md border px-3 text-sm"
              value={packageId}
              onChange={(e) => {
                setPackageId(e.target.value ? Number(e.target.value) : "");
                setCustomDays("");
              }}
            >
              <option value="">{t("admin.packageOption")}</option>
              {packages.map((p: AdminPackageDto) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.duration}{" "}
                  {p.durationUnit === "days" ? t("admin.day") : t("admin.month")}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label>{t("admin.customDays")}</Label>
            <Input
              type="number"
              min={1}
              value={customDays}
              onChange={(e) => {
                setCustomDays(e.target.value);
                setPackageId("");
              }}
              placeholder={t("admin.customDaysPlaceholder")}
            />
          </div>

          <div className="space-y-1">
            <Label>{t("admin.notes")}</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => activateMutation.mutate()}
              disabled={activateMutation.isPending}
            >
              {t("admin.activate")}
            </Button>
            <Button variant="secondary" onClick={onClose}>
              {t("common.cancel")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
