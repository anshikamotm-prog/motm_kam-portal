import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSheetValues, batchUpdate, colToLetter } from "@/lib/sheets"
import { parseClient } from "@/lib/sheets-helpers"
import { SHEET_ID, SHEETS, COLS } from "@/constants"
import { esc, nowIST } from "@/lib/utils"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const rows = await getSheetValues(SHEET_ID, SHEETS.CLIENT_MASTER)
  const rowIndex = rows.slice(1).findIndex((r) => r[COLS.CLIENT.ID] === id)
  if (rowIndex === -1) return NextResponse.json({ error: "Client not found" }, { status: 404 })

  const rowNum = rowIndex + 2
  const client = parseClient(rows[rowIndex + 1], rowNum)

  // SE cannot edit client master
  if (session.user.role === "SE" || session.user.role === "DR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  // KAMs can only edit their own clients
  if (session.user.role !== "Admin" && client.kam !== session.user.kamName) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const c = COLS.CLIENT
  const updates: Array<{ range: string; values: unknown[][] }> = []

  const map: Record<string, number> = {
    status: c.STATUS + 1,
    health: c.HEALTH + 1,
    feedbackStatus: c.FEEDBACK_STATUS + 1,
    nextFollowup: c.NEXT_FOLLOWUP + 1,
    lastFeedbackDate: c.LAST_FEEDBACK_DATE + 1,
    kamNotes: c.KAM_NOTES + 1,
  }

  for (const [key, col] of Object.entries(map)) {
    if (body[key] !== undefined) {
      const colLetter = colToLetter(col)
      updates.push({ range: `${SHEETS.CLIENT_MASTER}!${colLetter}${rowNum}`, values: [[esc(String(body[key]))]] })
    }
  }

  if (updates.length > 0) {
    await batchUpdate(SHEET_ID, updates)
  }

  return NextResponse.json({ success: true })
}
