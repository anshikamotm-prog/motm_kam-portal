import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSheetValues, batchUpdate } from "@/lib/sheets"
import { SHEET_ID, SHEETS, COLS } from "@/constants"
import { esc } from "@/lib/utils"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const rowNum = parseInt(id, 10)
  if (isNaN(rowNum) || rowNum < 2) return NextResponse.json({ error: "Invalid row" }, { status: 400 })

  const body = await req.json()
  const rows = await getSheetValues(SHEET_ID, SHEETS.TARGETS)
  const row = rows[rowNum - 1]
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // KAMs can only update their own targets and only the achieved field
  const targetKAM = row[COLS.TARGET.KAM]
  if (session.user.role !== "Admin") {
    if (targetKAM !== session.user.kamName) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (body.type !== undefined || body.notes !== undefined || body.target !== undefined) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  const type = body.type ?? row[COLS.TARGET.TYPE]
  const updates: Array<{ range: string; values: unknown[][] }> = []

  if (type !== "Enquiries" && body.achieved !== undefined) {
    const target = parseFloat(row[COLS.TARGET.TARGET]) || 0
    const achieved = parseFloat(String(body.achieved)) || 0
    const pct = target > 0 ? Math.round((achieved / target) * 100) : 0
    const status = pct >= 100 ? "Achieved" : pct >= 70 ? "On Track" : pct >= 40 ? "Behind" : "At Risk"
    updates.push(
      { range: `${SHEETS.TARGETS}!G${rowNum}`, values: [[achieved]] },
      { range: `${SHEETS.TARGETS}!H${rowNum}`, values: [[`${pct}%`]] },
      { range: `${SHEETS.TARGETS}!I${rowNum}`, values: [[status]] },
    )
  }
  if (body.type !== undefined) updates.push({ range: `${SHEETS.TARGETS}!K${rowNum}`, values: [[esc(body.type)]] })
  if (body.notes !== undefined) updates.push({ range: `${SHEETS.TARGETS}!J${rowNum}`, values: [[esc(body.notes)]] })
  if (body.target !== undefined) updates.push({ range: `${SHEETS.TARGETS}!F${rowNum}`, values: [[esc(String(body.target))]] })

  if (updates.length > 0) await batchUpdate(SHEET_ID, updates)
  return NextResponse.json({ success: true })
}
