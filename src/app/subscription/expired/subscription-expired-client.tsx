"use client";

import { signOut } from "next-auth/react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SubscriptionExpiredClient() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-rx-bg-subtle p-6">
      <Card className="w-full max-w-md border-0 text-center shadow-xl">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-rx-danger">
            <AlertCircle size={32} />
          </div>
          <CardTitle className="text-2xl text-rx-danger">انتهى الاشتراك</CardTitle>
          <CardDescription className="text-base">
            انتهت صلاحية اشتراكك. يرجى تجديد الاشتراك للاستمرار في استخدام
            النظام.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-rx-muted">
            تواصل مع الإدارة لتفعيل باقة جديدة.
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() =>
              signOut({ callbackUrl: "/auth/signin", redirect: true })
            }
          >
            تسجيل الخروج والعودة
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
