import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSheetValues } from "@/lib/sheets"
import { SHEET_ID, SHEETS, COLS } from "@/constants"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { clientId } = await params

  // Look up the client's personal sheet ID
  const clientRows = await getSheetValues(SHEET_ID, SHEETS.CLIENT_MASTER)
  const clientRow = clientRows.slice(1).find((r) => r[COLS.CLIENT.ID] === clientId)
  if (!clientRow) return NextResponse.json({ error: "Client not found" }, { status: 404 })

  // Verify ownership
  if (session.user.role === "DR") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  if (session.user.role !== "Admin") {
    const owned = session.user.role === "SE"
      ? clientRow[COLS.CLIENT.SE] === session.user.fullName
      : clientRow[COLS.CLIENT.KAM] === session.user.kamName
    if (!owned) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const sheetId = clientRow[COLS.CLIENT.SHEET_ID]
  if (!sheetId) return NextResponse.json([])

  try {
    const rows = await getSheetValues(sheetId, "MOM_Log")
    const g = (row: string[], i: number) => row[i] ?? ""
    const moms = rows.slice(1).map((row, i) => ({
      rowNum: i + 2,
      date: g(row, 0),
      time: g(row, 1),
      venue: g(row, 2),
      meetingType: g(row, 3),
      attendees: g(row, 4),
      agenda: g(row, 5),
      discussionPoints: g(row, 6),
      openIssues: g(row, 7),
      actionItems: g(row, 8),
      decisionsTaken: g(row, 9),
      nextMeetingDate: g(row, 10),
      preparedBy: g(row, 11),
      loggedAt: g(row, 12),
    }))
    return NextResponse.json(moms.reverse())
  } catch {
    return NextResponse.json([])
  }
}
