"use client";

import { SessionProvider } from "next-auth/react";
import { AuthProvider } from "@/contexts/AuthContext";

export function ClientProviders({ session, children }: { session: any; children: React.ReactNode }) {
  return (
    <SessionProvider session={session}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </SessionProvider>
  );
}
