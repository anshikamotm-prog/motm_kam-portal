import { NextRequest, NextResponse } from "next/server"

const VALID_CODES = () => [
  process.env.GATE_CODE_ADMIN,
  process.env.GATE_CODE_KAM,
  process.env.GATE_CODE_SE,
  process.env.GATE_CODE_DR,
].filter(Boolean) as string[]

// In-memory rate limiter: max 10 failed attempts per IP per 15 minutes (C-3)
const attempts = new Map<string, { count: number; firstAttempt: number }>()
const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 10

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  const now = Date.now()

  const entry = attempts.get(ip)
  if (entry) {
    if (now - entry.firstAttempt > WINDOW_MS) {
      attempts.delete(ip)
    } else if (entry.count >= MAX_ATTEMPTS) {
      return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 })
    }
  }

  const { code } = await req.json()
  const valid = VALID_CODES()

  if (!code || !valid.length || !valid.includes(code.trim())) {
    const cur = attempts.get(ip) ?? { count: 0, firstAttempt: now }
    attempts.set(ip, { count: cur.count + 1, firstAttempt: cur.firstAttempt })
    return NextResponse.json({ error: "invalid" }, { status: 401 })
  }

  // Success — clear rate limit entry
  attempts.delete(ip)

  const res = NextResponse.json({ ok: true })
  res.cookies.set("__gp", process.env.GATE_PASS!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24 hours — matches session lifetime (L-1)
    path: "/",
  })
  return res
}
