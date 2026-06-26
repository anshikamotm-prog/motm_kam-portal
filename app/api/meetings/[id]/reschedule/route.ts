import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSheetValues, batchUpdate } from "@/lib/sheets"
import { SHEET_ID, SHEETS, COLS } from "@/constants"
import { esc } from "@/lib/utils"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role === "SE" || session.user.role === "DR") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const { newDate, newTime, reason } = body

  if (!newDate) return NextResponse.json({ error: "newDate is required" }, { status: 400 })

  const rows = await getSheetValues(SHEET_ID, SHEETS.MEETING_SCHEDULE)
  const idx = rows.slice(1).findIndex((r) => r[COLS.MEETING.ID] === id)
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const rowNum = idx + 2
  const meetingKAM = rows[idx + 1][COLS.MEETING.KAM]
  if (session.user.role !== "Admin" && meetingKAM !== session.user.kamName) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await batchUpdate(SHEET_ID, [
    { range: `${SHEETS.MEETING_SCHEDULE}!H${rowNum}`, values: [[esc(newDate)]] },
    { range: `${SHEETS.MEETING_SCHEDULE}!I${rowNum}`, values: [[esc(newTime ?? "")]] },
    { range: `${SHEETS.MEETING_SCHEDULE}!K${rowNum}`, values: [["Rescheduled"]] },
    { range: `${SHEETS.MEETING_SCHEDULE}!V${rowNum}`, values: [[esc(reason ?? "")]] },
  ])

  return NextResponse.json({ success: true })
}
