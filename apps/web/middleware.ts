import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_FILE = /\.(.*)$/;

const publicRoutes = ["/", "/login", "/bots", "/about", "/privacy-policy", "/terms", "/cookies", "/blog", "/careers"];

const adminPathPrefix = `/${process.env.ADMIN_SECRET_PATH || "_default_admin_path"}`;

export default withAuth(
  async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    if (
      pathname.startsWith("/_next") ||
      pathname.startsWith("/static") ||
      pathname.startsWith("/api") ||
      PUBLIC_FILE.test(pathname) ||
      publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))
    ) {
      return NextResponse.next();
    }

    if (pathname.startsWith(adminPathPrefix)) {
      return NextResponse.next();
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
