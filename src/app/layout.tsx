import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";
import "@/styles/recipe-fonts.css";

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-arabic",
});

export const metadata: Metadata = {
  title: "RX Clinic",
  description: "Clinic & prescription management — إدارة العيادات والوصفات الطبية",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RX Clinic",
  },
};

export const viewport: Viewport = {
  themeColor: "#0891b2",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${ibmPlexArabic.variable} h-full`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var l=localStorage.getItem('rx-locale');if(l==='en'){document.documentElement.lang='en';document.documentElement.dir='ltr';}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
