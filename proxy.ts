import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

// Paths that skip the gate entirely
const GATE_FREE = ["/gate", "/api/gate", "/api/auth", "/_next", "/favicon"]

// XOR-based comparison — avoids V8 short-circuit on string inequality (C-2)
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── 1. Gate check ───────────────────────────────────────────────────────────
  // Skip for gate page, gate API, and Next.js internals
  const skipGate = GATE_FREE.some((p) => pathname.startsWith(p))
  if (!skipGate) {
    const gp = req.cookies.get("__gp")?.value ?? ""
    if (!gp || !safeEqual(gp, process.env.GATE_PASS ?? "")) {
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
    // Block missing tokens AND deactivated users (M-8)
    if (!token || token.deactivated) {
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
