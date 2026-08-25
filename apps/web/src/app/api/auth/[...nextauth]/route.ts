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
        const discordProfile = profile as any;
        const processedUser = user as any;

        token.username = discordProfile?.username || processedUser?.username || processedUser?.name;
        token.picture = processedUser?.image;

        // Set the Discord user ID from multiple possible sources
        const discordId = account.providerAccountId || discordProfile?.id || processedUser?.id;
        if (discordId) {
          token.sub = discordId;
          token.uid = discordId;
        }
      }

      // Sync user to our database
      if (token.sub) {
        try {
          await markAdminIfAllowlisted(
            token.sub,
            token.username || "Unknown",
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
