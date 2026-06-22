import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { appendRows } from "@/lib/sheets"
import { SHEET_ID, SHEETS } from "@/constants"
import { esc, getCurrentPeriod } from "@/lib/utils"

interface BulkRow {
  period: string
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

    const sheetRows = rows.map((r) => [
      esc(period), esc(r.kam), esc(r.seName ?? ""),
      esc(r.clientId), esc(r.company),
      esc(String(r.target ?? 0)), "0", "0%", "Open", "", esc(r.type ?? "Visits"),
    ])

    await appendRows(SHEET_ID, SHEETS.TARGETS, sheetRows)

    return NextResponse.json({ saved: sheetRows.length })
  } catch (err) {
    console.error("[targets/bulk POST]", err)
    return NextResponse.json({ error: "Failed to save targets" }, { status: 500 })
  }
}
