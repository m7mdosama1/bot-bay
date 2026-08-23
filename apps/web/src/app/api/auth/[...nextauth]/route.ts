import NextAuth from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { upsertUser } from "@/lib/prisma";

const handler = NextAuth({
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: { params: { scope: "identify guilds email" } },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub!;
        session.user.username = token.username as string;
        session.user.avatar = token.picture as string;
        session.accessToken = token.access_token as string;
      }
      return session;
    },
    async jwt({ token, account, user, profile }) {
      if (account) {
        token.access_token = account.access_token;
        token.username = (user as any)?.username || (user as any)?.name;
        token.picture = (user as any)?.image;
      }

      // Use Discord profile ID as the sub if not already set
      const discordId = (profile as any)?.id || (user as any)?.id || token.sub;
      if (discordId) {
        token.sub = discordId as string;
      }

      // Sync user to our database on first login
      if (token.sub && (token.username || (profile as any)?.username || (user as any)?.name)) {
        try {
          await upsertUser(
            token.sub,
            token.username || (profile as any)?.username || (user as any)?.name || "Unknown",
            token.picture || null
          );
        } catch (error) {
          console.error("Failed to sync user to database:", error);
        }
      }

      return token;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});

export { handler as GET, handler as POST };
