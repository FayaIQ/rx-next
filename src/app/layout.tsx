import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Providers } from "@/components/providers";
import "./globals.css";
import "@/styles/recipe-fonts.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "https://rx.faya.dev"),
  applicationName: "RX Clinic",
  creator: "Faya Dev LTD",
  publisher: "Faya Dev LTD",
  category: "Clinic management software",
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
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: {
    google: "KqLp6ttmLMHdQUrSFXISNyygINd-ciDzj9XiXJ5ZyZ8",
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
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://rx.faya.dev/#website",
        url: "https://rx.faya.dev",
        name: "RX Clinic",
        description: "نظام إدارة العيادات والمرضى والمواعيد والوصفات والحسابات في العراق.",
        inLanguage: ["ar-IQ", "en"],
        publisher: { "@id": "https://rx.faya.dev/#organization" },
      },
      {
        "@type": "Organization",
        "@id": "https://rx.faya.dev/#organization",
        name: "Faya Dev LTD",
        url: "https://faya.dev",
        logo: {
          "@type": "ImageObject",
          url: "https://rx.faya.dev/brand/logo.png",
          width: 512,
          height: 512,
        },
        brand: {
          "@type": "Brand",
          "@id": "https://rx.faya.dev/#brand",
          name: "RX Clinic",
          url: "https://rx.faya.dev",
        },
        knowsAbout: [
          "Clinic management software",
          "Patient records",
          "Clinic appointments",
          "Electronic prescriptions",
          "Dental clinic workflows",
        ],
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://rx.faya.dev/#software",
        name: "RX Clinic",
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "Clinic management software",
        operatingSystem: "Web",
        inLanguage: ["ar", "en"],
        url: "https://rx.faya.dev",
        description: "نظام عربي لإدارة المرضى والمواعيد والوصفات والحسابات وعيادات الأسنان في العراق.",
        offers: {
          "@type": "Offer",
          price: "160000",
          priceCurrency: "IQD",
          availability: "https://schema.org/InStock",
          url: "https://rx.faya.dev/auth/signup",
        },
        provider: { "@id": "https://rx.faya.dev/#organization" },
      },
    ],
  };

  return (
    <html lang="ar" dir="rtl" className="h-full" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var l=localStorage.getItem('rx-locale');if(l==='en'){document.documentElement.lang='en';document.documentElement.dir='ltr';}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full antialiased" data-clarity-mask="true">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteJsonLd).replace(/</g, "\\u003c"),
          }}
        />
        <Providers>{children}</Providers>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-46PTJCE9ED"
          strategy="afterInteractive"
        />
        <Script id="rx-google-tag" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;

            gtag('js', new Date());
            gtag('config', 'G-46PTJCE9ED');
            gtag('config', 'AW-17698783004');
          `}
        </Script>
      </body>
    </html>
  );
}
