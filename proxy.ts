import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export default withAuth(
  async function middleware(req: NextRequest) {
    const token = await getToken({ req })
    const pathname = req.nextUrl.pathname

    // Admin-only routes
    if (pathname.startsWith("/admin") && !pathname.startsWith("/api/auth")) {
      if (!token || token.role !== "Admin") {
        return NextResponse.redirect(new URL("/dashboard", req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  },
)

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/api/((?!auth).*)"],
}
