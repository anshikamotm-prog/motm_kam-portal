import { NextRequest, NextResponse } from "next/server"

const VALID_CODES = () => [
  process.env.GATE_CODE_ADMIN,
  process.env.GATE_CODE_KAM,
  process.env.GATE_CODE_SE,
  process.env.GATE_CODE_DR,
].filter(Boolean) as string[]

export async function POST(req: NextRequest) {
  const { code } = await req.json()

  const valid = VALID_CODES()
  if (!code || !valid.length || !valid.includes(code.trim())) {
    return NextResponse.json({ error: "invalid" }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set("__gp", process.env.GATE_PASS!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  })
  return res
}
