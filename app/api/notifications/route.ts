import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSheetValues } from "@/lib/sheets"
import { parseNotification } from "@/lib/sheets-helpers"
import { SHEET_ID, SHEETS, COLS } from "@/constants"
import { parseFlexDate } from "@/lib/utils"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role === "SE" || session.user.role === "DR") return NextResponse.json([])

  const rows = await getSheetValues(SHEET_ID, SHEETS.NOTIFICATION_LOG)
  let data = rows.slice(1).map((row, i) => parseNotification(row, i + 2))

  if (session.user.role !== "Admin") {
    data = data.filter((n) => n.kam === session.user.kamName)
  }

  // H-2: localeCompare on en-IN "D/M/YYYY" strings sorts incorrectly — use parsed timestamps
  data.sort((a, b) => (parseFlexDate(b.timestamp)?.getTime() ?? 0) - (parseFlexDate(a.timestamp)?.getTime() ?? 0))
  return NextResponse.json(data)
}
