import { Suspense } from "react";
import { PrescriptionComposer } from "@/components/prescription/prescription-composer";

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-rx-muted">
          جاري التحميل...
        </div>
      }
    >
      <PrescriptionComposer />
    </Suspense>
  );
}
