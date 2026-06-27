import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSheetValues } from "@/lib/sheets"
import { parseUser } from "@/lib/sheets-helpers"
import { SHEET_ID, SHEETS } from "@/constants"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const rows = await getSheetValues(SHEET_ID, SHEETS.USERS)
  let data = rows.slice(1).map((r, i) => parseUser(r, i + 2))

  if (session.user.role === "Admin") {
    // Admin can filter by KAM to get assignable team members
    const filterKam = req.nextUrl.searchParams.get("kam")
    if (filterKam) {
      data = data.filter((u) => (u.role === "SE" || u.role === "DR") && u.kamName === filterKam && u.active?.toLowerCase() === "yes")
    }
  } else if (session.user.role === "KAM") {
    // KAM sees only their own active SE/DR team members
    data = data.filter((u) => (u.role === "SE" || u.role === "DR") && u.kamName === session.user.kamName && u.active?.toLowerCase() === "yes")
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return NextResponse.json(data)
}
