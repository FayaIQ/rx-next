import Image from "next/image";

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
