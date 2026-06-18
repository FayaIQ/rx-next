export type UserRole = "doctor" | "secretary" | "admin";

declare module "next-auth" {
  interface Session {
    user: {
      id: number;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      phoneNumber: string;
      type: UserRole;
      doctorId: number | null;
      isConfirmed: boolean;
      sessionId: string;
    };
  }

  interface User {
    id: number;
    name: string;
    phoneNumber: string;
    type: UserRole;
    doctorId: number | null;
    isConfirmed: boolean;
    sessionId: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: number;
    phoneNumber: string;
    type: UserRole;
    doctorId: number | null;
    isConfirmed: boolean;
    sessionId: string;
  }
}
