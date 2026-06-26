import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

// Paths that skip the gate entirely
const GATE_FREE = ["/gate", "/api/gate", "/api/auth", "/_next", "/favicon"]

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── 1. Gate check ───────────────────────────────────────────────────────────
  // Skip for gate page, gate API, and Next.js internals
  const skipGate = GATE_FREE.some((p) => pathname.startsWith(p))
  if (!skipGate) {
    const gp = req.cookies.get("__gp")?.value
    if (!gp || gp !== process.env.GATE_PASS) {
      const url = req.nextUrl.clone()
      url.pathname = "/gate"
      url.search = ""
      return NextResponse.redirect(url)
    }
  }

  // ── 2. Auth check for protected routes ──────────────────────────────────────
  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    (pathname.startsWith("/api") &&
      !pathname.startsWith("/api/auth") &&
      !pathname.startsWith("/api/gate"))

  if (isProtected) {
    const token = await getToken({ req })
    if (!token) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      return NextResponse.redirect(new URL("/login", req.url))
    }

    // Admin-only routes
    if (pathname.startsWith("/admin") && token.role !== "Admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
