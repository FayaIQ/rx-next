import type { MetadataRoute } from "next";

const siteUrl = process.env.APP_URL ?? "https://rx.faya.dev";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/terms", "/privacy"],
      disallow: [
        "/api/", "/auth/", "/dashboard/", "/dates/", "/dental/",
        "/finances/", "/home/", "/patients/", "/pharmaceutical/",
        "/prescriptions/", "/queue/", "/recipe-settings/", "/reports/",
        "/secretary/", "/setting/", "/subscription/", "/tasks/",
        "/treatment/", "/portal/", "/demo-preview",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
