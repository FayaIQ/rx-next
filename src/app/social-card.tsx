import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const socialCardSize = { width: 1200, height: 630 };
export const socialCardAlt =
  "RX Clinic — نظام إدارة العيادات والوصفات الطبية";

// Satori (used by next/og) supports WOFF, but not the WOFF2 files served to
// browsers. The package ships the matching Arabic font in the supported form.
const font = readFile(
  join(
    process.cwd(),
    "node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-700-normal.woff"
  )
);
const latinFont = readFile(
  join(
    process.cwd(),
    "node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-latin-700-normal.woff"
  )
);

export async function createSocialCard() {
  const [fontData, latinFontData] = await Promise.all([font, latinFont]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          color: "#ffffff",
          background:
            "linear-gradient(135deg, #083344 0%, #0e7490 52%, #22c55e 130%)",
          fontFamily: "IBMPlexArabic",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <div
            style={{
              display: "flex",
              width: "64px",
              height: "64px",
              borderRadius: "18px",
              alignItems: "center",
              justifyContent: "center",
              background: "#ffffff",
              color: "#0e7490",
              fontSize: "30px",
              fontFamily: "IBMPlexLatin",
            }}
          >
            RX
          </div>
          <span style={{ fontSize: "42px", letterSpacing: "1px", fontFamily: "IBMPlexLatin" }}>RX Clinic</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ fontSize: "72px", lineHeight: 1.25, direction: "rtl" }}>
            نظام إدارة العيادات
          </div>
          <div style={{ fontSize: "36px", color: "#cffafe", direction: "rtl" }}>
            إدارة المرضى والمواعيد والوصفات الطبية
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "27px", color: "#ecfeff" }}>
          <span>إدارة سهلة وآمنة لعيادتك</span>
          <span style={{ fontFamily: "IBMPlexLatin" }}>rx.faya.dev</span>
        </div>
      </div>
    ),
    {
      ...socialCardSize,
      fonts: [
        { name: "IBMPlexArabic", data: fontData, weight: 700, style: "normal" },
        { name: "IBMPlexLatin", data: latinFontData, weight: 700, style: "normal" },
      ],
    }
  );
}
