import NextAuth from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { prisma } from "@/lib/prisma";

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
    async jwt({ token, account, user }) {
      if (account) {
        token.access_token = account.access_token;
        token.username = (user as any)?.username || (user as any)?.name;
        token.picture = (user as any)?.image;
      }

      // Sync user to our database on first login
      if (token.sub && token.username) {
        await prisma.user.upsert({
          where: { id: token.sub },
          update: {
            username: token.username || "",
            avatar: token.picture || null,
          },
          create: {
            id: token.sub,
            username: token.username || "",
            avatar: token.picture || null,
          },
        });
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
