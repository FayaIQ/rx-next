import { Suspense } from "react";
import { DoctorQueuePage } from "@/components/waiting-room/doctor-queue-page";
import { CardsPageLoading } from "@/components/ui/page-loading";

export default function QueuePage() {
  return (
    <Suspense fallback={<CardsPageLoading cards={3} />}>
      <DoctorQueuePage />
    </Suspense>
  );
}
