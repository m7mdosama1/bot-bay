"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-bg-void text-text">
      <SiteHeader />

      <main className="flex items-center justify-center pt-24 min-h-screen">
        <div className="w-full max-w-md mx-auto px-6">
          <div className="text-center mb-8">
            <h1 className="font-display text-4xl font-bold gradient-text mb-2">
              Welcome to Bot Bay
            </h1>
            <p className="text-text-dim">
              Sign in with your Discord account to access your dashboard
            </p>
          </div>

          <div className="card-bg rounded-xl p-8 space-y-6">
            <button
              onClick={() => signIn("discord", { callbackUrl: "/dashboard" })}
              className="w-full btn btn-primary btn-lg rounded-xl font-mono text-sm tracking-wider justify-center"
            >
              Sign in with Discord
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-line" />
              </div>
              <div className="relative flex justify-center text-xs text-text-dim">
                <span className="px-3 bg-bg-raised">Or continue as guest</span>
              </div>
            </div>

            <Link
              href="/"
              className="block text-center text-sm text-text-dim hover:text-text transition-colors font-mono"
            >
              Browse bots without login
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
