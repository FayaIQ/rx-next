import type { Metadata } from "next";
import { BlogIndex } from "@/components/blog/blog-site";
import { getBlogPosts } from "@/lib/blogs";

export const metadata: Metadata = {
  title: "مدونة إدارة العيادات",
  description:
    "مقالات وأدلة عملية من RX Clinic لتنظيم العيادة وإدارة المرضى والمواعيد والوصفات الطبية.",
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    url: "/blog",
    locale: "ar_IQ",
    siteName: "RX Clinic",
    title: "مدونة RX Clinic",
    description: "أدلة عملية تساعد الطبيب وفريق العيادة على العمل بوضوح وكفاءة.",
  },
};

export default async function BlogPage() {
  const posts = await getBlogPosts();
  return <BlogIndex posts={posts} />;
}
