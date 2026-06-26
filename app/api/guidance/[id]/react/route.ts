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
  if (isNaN(rowNum)) return NextResponse.json({ error: "Invalid row" }, { status: 400 })

  const body = await req.json()
  const { reaction, reactionNote } = body

  if (!reaction) return NextResponse.json({ error: "reaction is required" }, { status: 400 })

  // Verify KAM can only react to their own notes
  const rows = await getSheetValues(SHEET_ID, SHEETS.ADMIN_NOTES)
  const row = rows[rowNum - 1]
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (session.user.role !== "Admin" && row[COLS.ADMIN_NOTE.KAM_ASSIGNED] !== session.user.kamName) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const an = COLS.ADMIN_NOTE
  await batchUpdate(SHEET_ID, [
    { range: `${SHEETS.ADMIN_NOTES}!G${rowNum}`, values: [["Yes"]] },
    { range: `${SHEETS.ADMIN_NOTES}!H${rowNum}`, values: [[esc(reaction)]] },
    { range: `${SHEETS.ADMIN_NOTES}!I${rowNum}`, values: [[esc(reactionNote ?? "")]] },
    { range: `${SHEETS.ADMIN_NOTES}!J${rowNum}`, values: [[nowIST()]] },
    { range: `${SHEETS.ADMIN_NOTES}!K${rowNum}`, values: [[esc(session.user.name ?? "")]] },
  ])

  return NextResponse.json({ success: true })
}
