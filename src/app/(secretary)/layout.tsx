import { requireSecretaryArea } from "@/lib/auth-server";
import SecretaryLayoutClient from "./secretary-layout-client";

export const dynamic = "force-dynamic";

export default async function SecretaryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSecretaryArea();

  return <SecretaryLayoutClient>{children}</SecretaryLayoutClient>;
}
