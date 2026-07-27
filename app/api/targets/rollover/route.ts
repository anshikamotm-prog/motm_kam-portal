import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSheetValues, appendRow } from "@/lib/sheets"
import { SHEET_ID, SHEETS, COLS } from "@/constants"
import { esc, getCurrentPeriod } from "@/lib/utils"
import { parseClient } from "@/lib/sheets-helpers"

const ARCHIVED_STATUSES = ["Closed", "Uncountable"]

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "Admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const [rows, clientRows] = await Promise.all([
    getSheetValues(SHEET_ID, SHEETS.TARGETS),
    getSheetValues(SHEET_ID, SHEETS.CLIENT_MASTER),
  ])
  const data = rows.slice(1)
  const archivedClientIds = new Set(
    clientRows.slice(1)
      .map((r, i) => parseClient(r, i + 2))
      .filter((c) => ARCHIVED_STATUSES.includes(c.status))
      .map((c) => c.clientId)
  )

  const currentPeriod = getCurrentPeriod()
  // Dedup key: clientId + type + seName so all target types roll over independently
  const currentKeys = new Set(
    data
      .filter((r) => r[COLS.TARGET.PERIOD] === currentPeriod)
      .map((r) => `${r[COLS.TARGET.CLIENT_ID]}|${r[COLS.TARGET.TYPE] ?? ""}|${r[COLS.TARGET.SE_NAME] ?? ""}`)
  )

  // Find the most recent distinct period that isn't current.
  // H-1: sort so the last element is chronologically the latest ("YYYY WNN" sorts correctly).
  const periods = [...new Set(data.map((r) => r[COLS.TARGET.PERIOD]))]
    .filter((p) => p !== currentPeriod)
    .sort()
  if (periods.length === 0) return NextResponse.json({ rolled: 0 })

  const lastPeriod = periods[periods.length - 1]
  const lastRows = data.filter((r) => r[COLS.TARGET.PERIOD] === lastPeriod)

  let rolled = 0
  for (const row of lastRows) {
    const clientId = row[COLS.TARGET.CLIENT_ID]
    if (archivedClientIds.has(clientId)) continue
    const key = `${clientId}|${row[COLS.TARGET.TYPE] ?? ""}|${row[COLS.TARGET.SE_NAME] ?? ""}`
    if (currentKeys.has(key)) continue

    await appendRow(SHEET_ID, SHEETS.TARGETS, [
      esc(currentPeriod),
      esc(row[COLS.TARGET.KAM]),
      esc(row[COLS.TARGET.SE_NAME]),
      esc(row[COLS.TARGET.CLIENT_ID]),
      esc(row[COLS.TARGET.COMPANY]),
      esc(row[COLS.TARGET.TARGET]),
      "0", "0%", "Open",
      esc(row[COLS.TARGET.NOTES] ?? ""),
      esc(row[COLS.TARGET.TYPE] ?? "Visits"),
    ])
    currentKeys.add(key)
    rolled++
  }

  return NextResponse.json({ success: true, rolled })
}
