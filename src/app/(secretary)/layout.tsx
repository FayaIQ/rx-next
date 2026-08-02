import { requireSecretaryArea } from "@/lib/auth-server";
import SecretaryLayoutClient from "./secretary-layout-client";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function SecretaryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSecretaryArea();

  return <SecretaryLayoutClient>{children}</SecretaryLayoutClient>;
}
