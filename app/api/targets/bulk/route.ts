import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSheetValues, appendRows, batchUpdate } from "@/lib/sheets"
import { SHEET_ID, SHEETS, COLS } from "@/constants"
import { esc, getCurrentPeriod } from "@/lib/utils"

interface BulkRow {
  period?: string
  kam: string
  seName: string
  clientId: string
  company: string
  target: string
  type: string
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "Admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const rows: BulkRow[] = body.rows ?? []
    if (!rows.length) return NextResponse.json({ error: "No rows" }, { status: 400 })

    const period = body.period ?? getCurrentPeriod()

    // Load existing targets to detect duplicates
    const existingRows = await getSheetValues(SHEET_ID, SHEETS.TARGETS)

    const toAppend: string[][] = []
    const toUpdate: Array<{ range: string; values: unknown[][] }> = []

    for (const r of rows) {
      const tgt = parseFloat(String(r.target ?? 0)) || 0

      // Find existing row matching period + clientId + type + seName (case-insensitive seName)
      const matchIdx = existingRows.findIndex((row, idx) => {
        if (idx === 0) return false // header
        return (
          row[COLS.TARGET.PERIOD] === period &&
          row[COLS.TARGET.CLIENT_ID] === r.clientId &&
          row[COLS.TARGET.TYPE] === r.type &&
          (row[COLS.TARGET.SE_NAME] ?? "").toLowerCase() === (r.seName ?? "").toLowerCase()
        )
      })

      if (matchIdx !== -1) {
        // Update existing row — recalculate pct/status from current achieved
        const rowNum = matchIdx + 1 // 1-based (header is row 1, data starts row 2)
        const achieved = parseFloat(existingRows[matchIdx][COLS.TARGET.ACHIEVED] ?? "0") || 0
        const pct = tgt > 0 ? Math.round((achieved / tgt) * 100) : 0
        const status = pct >= 100 ? "Achieved" : pct >= 70 ? "On Track" : pct >= 40 ? "Behind" : "At Risk"
        toUpdate.push(
          { range: `${SHEETS.TARGETS}!F${rowNum}`, values: [[tgt]] },
          { range: `${SHEETS.TARGETS}!H${rowNum}`, values: [[`${pct}%`]] },
          { range: `${SHEETS.TARGETS}!I${rowNum}`, values: [[status]] },
        )
      } else {
        toAppend.push([
          esc(period), esc(r.kam), esc(r.seName ?? ""),
          esc(r.clientId), esc(r.company),
          esc(String(tgt)), "0", "0%", "Open", "", esc(r.type ?? "Visits"),
        ])
      }
    }

    if (toUpdate.length) await batchUpdate(SHEET_ID, toUpdate)
    if (toAppend.length) await appendRows(SHEET_ID, SHEETS.TARGETS, toAppend)

    return NextResponse.json({ saved: rows.length, updated: toUpdate.length / 3, appended: toAppend.length })
  } catch (err) {
    console.error("[targets/bulk POST]", err)
    return NextResponse.json({ error: "Failed to save targets" }, { status: 500 })
  }
}
