import { UserRole } from "@prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: UserRole;
    schoolId: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: UserRole;
      schoolId: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole;
    schoolId: string | null;
  }
}
