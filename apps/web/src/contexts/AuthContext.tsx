"use client";

import { createContext, useContext, ReactNode } from "react";
import { signIn, signOut, useSession } from "next-auth/react";

interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  username?: string;
  avatar?: string;
}

interface SessionData {
  user: SessionUser;
  accessToken?: string;
}

interface AuthContextType {
  user: SessionUser | null;
  loading: boolean;
  signInWithDiscord: () => Promise<void>;
  signOutUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();

  const user = session?.user ? {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
    username: session.user.username,
    avatar: session.user.avatar,
  } : null;

  const signInWithDiscord = async () => {
    await signIn("discord", { callbackUrl: "/dashboard" });
  };

  const signOutUser = async () => {
    await signOut({ callbackUrl: "/" });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading: status === "loading",
        signInWithDiscord,
        signOutUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
