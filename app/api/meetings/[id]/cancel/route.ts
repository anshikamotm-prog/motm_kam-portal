import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSheetValues, batchUpdate } from "@/lib/sheets"
import { SHEET_ID, SHEETS, COLS } from "@/constants"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role === "SE" || session.user.role === "DR") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params

  try {
    const rows = await getSheetValues(SHEET_ID, SHEETS.MEETING_SCHEDULE)
    const idx = rows.slice(1).findIndex((r) => r[COLS.MEETING.ID] === id)
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const rowNum = idx + 2
    const meetingKAM = rows[idx + 1][COLS.MEETING.KAM]
    if (session.user.role !== "Admin" && meetingKAM !== session.user.kamName) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await batchUpdate(SHEET_ID, [
      { range: `${SHEETS.MEETING_SCHEDULE}!K${rowNum}`, values: [["Cancelled"]] },
    ])

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[meetings cancel]", err)
    return NextResponse.json({ error: "Failed to cancel meeting" }, { status: 500 })
  }
}
