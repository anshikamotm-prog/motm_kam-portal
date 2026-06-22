import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSheetValues } from "@/lib/sheets"
import { parseClient } from "@/lib/sheets-helpers"
import { SHEET_ID, SHEETS } from "@/constants"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const rows = await getSheetValues(SHEET_ID, SHEETS.CLIENT_MASTER)
    const data = rows.slice(1).map((row, i) => parseClient(row, i + 2))

    const filtered =
      session.user.role === "Admin"
        ? data
        : data.filter((c) => c.kam === session.user.kamName)

    return NextResponse.json(filtered)
  } catch (err) {
    console.error("[clients GET]", err)
    return NextResponse.json({ error: "Failed to load clients" }, { status: 500 })
  }
}
