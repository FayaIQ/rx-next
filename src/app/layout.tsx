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
  metadataBase: new URL(process.env.APP_URL ?? "https://rx.faya.dev"),
  title: {
    default: "RX Clinic | نظام إدارة العيادات",
    template: "%s | RX Clinic",
  },
  description:
    "نظام RX Clinic لإدارة العيادات والوصفات الطبية والمواعيد والمرضى، مع مزامنة آمنة والعمل دون إنترنت.",
  keywords: [
    "نظام إدارة عيادات", "برنامج عيادة", "إدارة المرضى", "إدارة المواعيد",
    "وصفات طبية إلكترونية", "عيادات الأسنان", "clinic management system",
    "electronic prescriptions",
  ],
  openGraph: {
    type: "website",
    url: "/",
    locale: "ar_IQ",
    siteName: "RX Clinic",
    title: "RX Clinic | نظام إدارة العيادات",
    description: "إدارة المرضى والمواعيد والوصفات الطبية من مكان واحد.",
  },
  twitter: {
    card: "summary_large_image",
    title: "RX Clinic | نظام إدارة العيادات",
    description: "إدارة المرضى والمواعيد والوصفات الطبية من مكان واحد.",
  },
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
      <body className="min-h-full antialiased" data-clarity-mask="true">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
