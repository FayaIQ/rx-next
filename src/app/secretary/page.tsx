import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { toDbId } from "@/lib/bigint";
import { SecretaryActivateClient } from "@/components/secretary/secretary-activate-client";

export const dynamic = "force-dynamic";

export default async function SecretaryWelcomePage() {
  const session = await auth();
  if (session?.user?.type === "secretary") {
    const user = await prisma.user.findUnique({
      where: { id: toDbId(session.user.id) },
      select: { isConfirmed: true },
    });
    if (user?.isConfirmed) {
      redirect("/secretary/desk");
    }
  }

  return <SecretaryActivateClient />;
}
