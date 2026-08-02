import NextAuth from "next-auth";
import { toOptionalUserId, toUserId } from "@/lib/user-id";

/**
 * Edge-safe Auth.js instance used by the request proxy only.
 *
 * Keep database-backed providers and JWT refreshes in `auth.ts`: importing
 * them here would bundle Prisma's PostgreSQL driver into the Edge runtime.
 */
export const { auth } = NextAuth({
  providers: [],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async session({ session, token }) {
      if (!token?.id) return session;

      return {
        ...session,
        user: {
          id: toUserId(token.id),
          name: typeof token.name === "string" ? token.name : session.user.name,
          phoneNumber: String(token.phoneNumber ?? ""),
          type: (token.type ?? "doctor") as "doctor" | "secretary" | "admin",
          doctorId: toOptionalUserId(token.doctorId),
          isConfirmed: Boolean(token.isConfirmed),
          sessionId: String(token.sessionId ?? ""),
        },
      };
    },
  },
  trustHost: true,
});
