import { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user: {
      id: string;
      username?: string;
      avatar?: string;
    } & DefaultSession["user"];
  }

  interface JWT {
    accessToken?: string;
    username?: string;
  }

  interface User {
    username?: string;
    avatar?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    username?: string;
  }
}

declare module "next-auth" {
  interface User {
    username?: string;
    avatar?: string;
  }
}

export {};
