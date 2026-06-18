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

export function ActivateSubscriptionDialog({
  user,
  onClose,
}: {
  user: AdminUserDto;
  onClose: () => void;
}) {
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
      if (!days || days < 1) throw new Error("أدخل عدد أيام صالح");
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
      toast.success(`تم تفعيل اشتراك ${user.name}`);
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>تفعيل اشتراك — {user.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>اختر باقة</Label>
            <select
              className="h-10 w-full rounded-md border px-3 text-sm"
              value={packageId}
              onChange={(e) => {
                setPackageId(e.target.value ? Number(e.target.value) : "");
                setCustomDays("");
              }}
            >
              <option value="">— باقة —</option>
              {packages.map((p: AdminPackageDto) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.duration}{" "}
                  {p.durationUnit === "days" ? "يوم" : "شهر"}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label>أو مدة مخصصة (أيام)</Label>
            <Input
              type="number"
              min={1}
              value={customDays}
              onChange={(e) => {
                setCustomDays(e.target.value);
                setPackageId("");
              }}
              placeholder="مثال: 30"
            />
          </div>

          <div className="space-y-1">
            <Label>ملاحظات</Label>
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
              تفعيل
            </Button>
            <Button variant="secondary" onClick={onClose}>
              إلغاء
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
