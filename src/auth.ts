import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { toOptionalUserId, toUserId } from "@/lib/user-id";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      id: "credentials",
      name: "credentials",
      credentials: {
        phone: { label: "Phone", type: "text" },
        password: { label: "Password", type: "password" },
        role: { label: "Role", type: "text" },
      },
      async authorize(credentials) {
        const { authenticateUser } = await import("@/lib/auth-credentials");
        const phone = credentials?.phone as string | undefined;
        const password = credentials?.password as string | undefined;
        const role = credentials?.role as string | undefined;

        if (!phone || !password) return null;

        const user = await authenticateUser(phone, password);
        if (!user) return null;

        if (role === "secretary" && user.type !== "secretary") return null;
        if (role === "doctor" && user.type !== "doctor" && user.type !== "admin")
          return null;
        if (role === "admin" && user.type !== "admin") return null;
        if (!role && user.type === "secretary") return null;

        return user;
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = toUserId(user.id);
        token.phoneNumber = user.phoneNumber;
        token.type = user.type;
        token.doctorId = toOptionalUserId(user.doctorId);
        token.isConfirmed = user.isConfirmed;
        token.sessionId = user.sessionId;
      }

      if (trigger === "update" && token.id) {
        const { prisma } = await import("@/lib/prisma");
        const { toDbId, fromDbId } = await import("@/lib/bigint");
        const dbUser = await prisma.user.findUnique({
          where: { id: toDbId(token.id as number) },
          select: { isConfirmed: true, doctorId: true },
        });
        if (dbUser) {
          token.isConfirmed = dbUser.isConfirmed;
          token.doctorId = dbUser.doctorId
            ? fromDbId(dbUser.doctorId)
            : null;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (!token?.id) return session;

      return {
        ...session,
        user: {
          id: toUserId(token.id),
          name: token.name ?? session.user.name,
          phoneNumber: token.phoneNumber,
          type: token.type,
          doctorId: toOptionalUserId(token.doctorId),
          isConfirmed: token.isConfirmed,
          sessionId: token.sessionId,
        },
      };
    },
  },
  trustHost: true,
});
