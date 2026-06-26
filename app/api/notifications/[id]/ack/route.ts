import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSheetValues, batchUpdate } from "@/lib/sheets"
import { SHEET_ID, SHEETS, COLS } from "@/constants"
import { esc, nowIST } from "@/lib/utils"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role === "SE" || session.user.role === "DR") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const rowNum = parseInt(id, 10)
  if (isNaN(rowNum)) return NextResponse.json({ error: "Invalid" }, { status: 400 })

  // KAMs can only ack their own notifications
  if (session.user.role !== "Admin") {
    const rows = await getSheetValues(SHEET_ID, SHEETS.NOTIFICATION_LOG)
    const row = rows[rowNum - 1]
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (row[COLS.NOTIFICATION.KAM] !== session.user.kamName) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  await batchUpdate(SHEET_ID, [
    { range: `${SHEETS.NOTIFICATION_LOG}!J${rowNum}`, values: [["Yes"]] },
    { range: `${SHEETS.NOTIFICATION_LOG}!K${rowNum}`, values: [[esc(session.user.name ?? "")]] },
    { range: `${SHEETS.NOTIFICATION_LOG}!L${rowNum}`, values: [[nowIST()]] },
  ])

  return NextResponse.json({ success: true })
}
