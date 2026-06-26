import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSheetValues } from "@/lib/sheets"
import { parseNotification } from "@/lib/sheets-helpers"
import { SHEET_ID, SHEETS, COLS } from "@/constants"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role === "SE" || session.user.role === "DR") return NextResponse.json([])

  const rows = await getSheetValues(SHEET_ID, SHEETS.NOTIFICATION_LOG)
  let data = rows.slice(1).map((row, i) => parseNotification(row, i + 2))

  if (session.user.role !== "Admin") {
    data = data.filter((n) => n.kam === session.user.kamName)
  }

  data.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  return NextResponse.json(data)
}
