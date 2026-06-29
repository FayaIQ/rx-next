"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AppHeader } from "@/components/layout/app-header";
import { SmartAlertsPanel } from "@/components/alerts/smart-alerts-panel";
import { PageContent } from "@/components/ui/page-shell";
import { WaitingRoomBoard } from "@/components/waiting-room/waiting-room-board";
import { rxApi } from "@/lib/api/rx-client";

function formatTodayLabel() {
  return new Date().toLocaleDateString("ar-SY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    numberingSystem: "latn",
  });
}

export function DoctorQueuePage() {
  const router = useRouter();

  async function handleSelectPatient(patientId: number) {
    try {
      await rxApi.patients.get(patientId);
      router.push(`/home?patientId=${patientId}`);
    } catch {
      toast.error("تعذّر فتح ملف المريض");
    }
  }

  return (
    <>
      <AppHeader
        title="طابور الاستدعاء"
        subtitle={formatTodayLabel()}
      />
      <PageContent className="space-y-4">
        <div className="xl:hidden">
          <SmartAlertsPanel compact />
        </div>
        <WaitingRoomBoard
          role="doctor"
          onSelectPatient={handleSelectPatient}
        />
      </PageContent>
    </>
  );
}
