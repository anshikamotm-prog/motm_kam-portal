import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSheetValues, appendRow } from "@/lib/sheets"
import { SHEET_ID, SHEETS, COLS } from "@/constants"
import { esc, getCurrentPeriod } from "@/lib/utils"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "Admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const rows = await getSheetValues(SHEET_ID, SHEETS.TARGETS)
  const data = rows.slice(1)

  const currentPeriod = getCurrentPeriod()
  const currentClientIds = new Set(
    data.filter((r) => r[COLS.TARGET.PERIOD] === currentPeriod).map((r) => r[COLS.TARGET.CLIENT_ID]),
  )

  // Find the most recently added distinct period that isn't current
  const periods = [...new Set(data.map((r) => r[COLS.TARGET.PERIOD]))].filter((p) => p !== currentPeriod)
  if (periods.length === 0) return NextResponse.json({ rolled: 0 })

  const lastPeriod = periods[periods.length - 1]
  const lastRows = data.filter((r) => r[COLS.TARGET.PERIOD] === lastPeriod)

  let rolled = 0
  for (const row of lastRows) {
    const clientId = row[COLS.TARGET.CLIENT_ID]
    if (currentClientIds.has(clientId)) continue

    await appendRow(SHEET_ID, SHEETS.TARGETS, [
      esc(currentPeriod),
      esc(row[COLS.TARGET.KAM]),
      esc(row[COLS.TARGET.SE_NAME]),
      esc(clientId),
      esc(row[COLS.TARGET.COMPANY]),
      esc(row[COLS.TARGET.TARGET]),
      "0", "0%", "Open",
      esc(row[COLS.TARGET.NOTES] ?? ""),
      esc(row[COLS.TARGET.TYPE] ?? "Visits"),
    ])
    currentClientIds.add(clientId)
    rolled++
  }

  return NextResponse.json({ success: true, rolled })
}
