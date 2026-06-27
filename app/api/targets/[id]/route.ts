import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSheetValues, appendRow, batchUpdate } from "@/lib/sheets"
import { SHEET_ID, SHEETS, COLS } from "@/constants"
import { esc, parsePeriod } from "@/lib/utils"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role === "SE") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const rowNum = parseInt(id, 10)
  if (isNaN(rowNum) || rowNum < 2) return NextResponse.json({ error: "Invalid row" }, { status: 400 })

  const body = await req.json()
  const rows = await getSheetValues(SHEET_ID, SHEETS.TARGETS)
  const row = rows[rowNum - 1]
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const targetKAM = row[COLS.TARGET.KAM]
  const targetSE = row[COLS.TARGET.SE_NAME]
  const targetType = row[COLS.TARGET.TYPE]
  const rowPeriod = row[COLS.TARGET.PERIOD] ?? ""

  // DR can only update achieved on their own Data Collection targets
  if (session.user.role === "DR") {
    if (targetSE !== session.user.fullName) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (targetType === "Email Response") {
      return NextResponse.json({ error: "Email Response count is auto-calculated from logged responses" }, { status: 400 })
    }
    if (body.type !== undefined || body.notes !== undefined || body.target !== undefined) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // H-3: reject invalid period strings before using them
    if (body.period !== undefined && !parsePeriod(body.period)) {
      return NextResponse.json({ error: "Invalid period format" }, { status: 400 })
    }

    // If this is a carried-forward row (period mismatch), create a new row for the
    // current period instead of overwriting the original week's data.
    const activePeriod: string = body.period ?? rowPeriod
    if (activePeriod && activePeriod !== rowPeriod && body.achieved !== undefined) {
      const tgt = parseFloat(row[COLS.TARGET.TARGET]) || 0
      const achieved = parseFloat(String(body.achieved)) || 0
      const pct = tgt > 0 ? Math.round((achieved / tgt) * 100) : 0
      const status = pct >= 100 ? "Achieved" : pct >= 70 ? "On Track" : pct >= 40 ? "Behind" : "At Risk"
      await appendRow(SHEET_ID, SHEETS.TARGETS, [
        esc(activePeriod),
        esc(row[COLS.TARGET.KAM] ?? ""),
        esc(targetSE),
        esc(row[COLS.TARGET.CLIENT_ID] ?? ""),
        esc(row[COLS.TARGET.COMPANY] ?? ""),
        esc(String(tgt)),
        esc(String(achieved)),
        `${pct}%`,
        status,
        esc(row[COLS.TARGET.NOTES] ?? ""),
        esc(targetType),
      ])
      return NextResponse.json({ success: true, created: true })
    }
  } else if (session.user.role !== "Admin") {
    // KAMs can only update their own targets and only the achieved field
    if (targetKAM !== session.user.kamName) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (body.type !== undefined || body.notes !== undefined || body.target !== undefined) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  const type = body.type ?? row[COLS.TARGET.TYPE]
  const updates: Array<{ range: string; values: unknown[][] }> = []

  // Email Response is always auto-counted from logged responses — block manual achieved updates for all roles
  if (type === "Email Response" && body.achieved !== undefined) {
    return NextResponse.json({ error: "Email Response count is auto-calculated from logged responses" }, { status: 400 })
  }

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
