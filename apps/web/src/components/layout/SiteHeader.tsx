"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export function SiteHeader() {
  const { user, signOutUser, isAuthenticated } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-line bg-bg-void/80 backdrop-blur-sm">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-display text-2xl font-bold gradient-text">
          BOT BAY
        </Link>

         <nav className="flex items-center gap-6">
          <Link
            href="/bots"
            className="text-sm text-text-dim hover:text-text transition-colors font-mono"
          >
            Browse Bots
          </Link>

          <Link
            href="/privacy-policy"
            className="text-sm text-text-dim hover:text-text transition-colors font-mono"
          >
            Privacy
          </Link>

          {isAuthenticated ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm text-text-dim hover:text-text transition-colors font-mono"
              >
                Dashboard
              </Link>
              <button
                onClick={signOutUser}
                className="text-sm text-text-dim hover:text-text transition-colors font-mono"
              >
                Sign Out
              </button>
              {(user?.image || user?.avatar) && (
                <img
                  src={user.image || (user.avatar?.startsWith("http") ? user.avatar : `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`)}
                  alt="avatar"
                  className="w-8 h-8 rounded-full"
                />
              )}
            </>
          ) : (
            <Link
              href="/login"
              className="btn btn-sm btn-primary rounded-full font-mono text-xs tracking-wider"
            >
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
