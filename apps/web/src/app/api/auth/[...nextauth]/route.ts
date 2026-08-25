import NextAuth from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { markAdminIfAllowlisted } from "@/lib/prisma";

const handler = NextAuth({
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: "https://discord.com/api/oauth2/authorize?scope=identify+guilds+email",
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.sub || "") as string;
        session.user.username = token.username as string;
        session.user.avatar = token.picture as string;
        session.accessToken = token.access_token as string;
      }
      return session;
    },
    async jwt({ token, account, user, profile, isNewUser }) {
      if (account && (user || profile)) {
        token.access_token = account.access_token;

        const discordProfile = profile as any;
        const processedUser = user as any;

        token.username = discordProfile?.username || processedUser?.username || processedUser?.name;
        token.picture = processedUser?.image;

        // Set the Discord user ID from multiple possible sources
        const discordId = account.providerAccountId || discordProfile?.id || processedUser?.id;
        if (discordId) {
          token.sub = discordId;
        }
      }

      // Sync user to our database
      if (token.sub) {
        try {
          await markAdminIfAllowlisted(
            token.sub,
            (token.username as string) || "Unknown",
            (token.picture as string) || null
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
