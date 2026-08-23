import NextAuth from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { markAdminIfAllowlisted } from "@/lib/prisma";

const handler = NextAuth({
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        url: "https://discord.com/api/oauth2/authorize",
        params: {
          scope: "identify guilds email",
          prompt: "consent",
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.sub || token.uid || "") as string;
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
        // Use providerAccountId (Discord user ID) as the sub
        if (account.providerAccountId) {
          token.sub = account.providerAccountId;
        } else if ((profile as any)?.id) {
          token.sub = (profile as any).id;
        } else if ((user as any)?.id) {
          token.sub = (user as any).id;
        }
      }

      // Sync user to our database on first login
      if (token.sub) {
        const username = token.username || (profile as any)?.username || (user as any)?.name || "Unknown";
        try {
          await markAdminIfAllowlisted(
            token.sub,
            username,
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
