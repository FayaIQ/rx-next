import { Suspense } from "react";
import { PrescriptionComposer } from "@/components/prescription/prescription-composer";
import { ComposerPageLoading } from "@/components/ui/page-loading";

export default function HomePage() {
  return (
    <Suspense fallback={<ComposerPageLoading />}>
      <PrescriptionComposer />
    </Suspense>
  );
}
