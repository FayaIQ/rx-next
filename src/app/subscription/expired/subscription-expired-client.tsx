"use client";

import { signOut, useSession } from "next-auth/react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLocale } from "@/i18n/locale-provider";

export function SubscriptionExpiredClient() {
  const { t } = useLocale();
  const { data: session } = useSession();
  const signInUrl =
    session?.user?.type === "secretary"
      ? "/auth/login/secretary"
      : "/auth/signin";

  return (
    <div className="flex min-h-screen items-center justify-center bg-rx-bg-subtle p-6">
      <Card className="w-full max-w-md border-0 text-center shadow-xl">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-rx-danger">
            <AlertCircle size={32} />
          </div>
          <CardTitle className="text-2xl text-rx-danger">
            {t("subscriptionExpired.title")}
          </CardTitle>
          <CardDescription className="text-base">
            {t("subscriptionExpired.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-rx-muted">
            {t("subscriptionExpired.contactAdmin")}
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() =>
              void signOut({ redirect: false }).then(() => {
                window.location.href = signInUrl;
              })
            }
          >
            {t("subscriptionExpired.logoutReturn")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
