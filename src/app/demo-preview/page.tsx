import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "معاينة RX Clinic",
  robots: { index: false, follow: false },
};

export default function DemoPreviewBootstrapPage() {
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-[#f5f8fa] p-4"
      dir="rtl"
    >
      <Image
        src="/why-rx-img.png"
        alt="معاينة نظام RX Clinic"
        width={1600}
        height={1000}
        priority
        className="h-auto w-full max-w-6xl rounded-2xl object-contain"
      />
    </main>
  );
}
