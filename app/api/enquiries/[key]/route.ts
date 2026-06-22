import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSheetValues, appendRow, batchUpdate } from "@/lib/sheets"
import { SHEET_ID, SHEETS, COLS } from "@/constants"
import { esc, nowIST } from "@/lib/utils"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { key } = await params
  if (!key) return NextResponse.json({ error: "Invalid key" }, { status: 400 })

  const body = await req.json()
  const { status, note } = body

  try {
    const rows = await getSheetValues(SHEET_ID, SHEETS.ENQUIRY_TRACKER)
    const idx = rows.slice(1).findIndex((r) => r[COLS.ENQUIRY_TRACKER.KEY] === key)

    const updatedBy = session.user.name ?? ""
    const updatedAt = nowIST()

    if (idx === -1) {
      const clientCode = key.split("-")[0]
      await appendRow(SHEET_ID, SHEETS.ENQUIRY_TRACKER, [
        esc(key), esc(clientCode), esc(status ?? "New"),
        esc(note ?? ""), esc(updatedBy), updatedAt,
      ])
    } else {
      const rowNum = idx + 2
      await batchUpdate(SHEET_ID, [
        { range: `${SHEETS.ENQUIRY_TRACKER}!C${rowNum}`, values: [[esc(status ?? "New")]] },
        { range: `${SHEETS.ENQUIRY_TRACKER}!D${rowNum}`, values: [[esc(note ?? "")]] },
        { range: `${SHEETS.ENQUIRY_TRACKER}!E${rowNum}`, values: [[esc(updatedBy)]] },
        { range: `${SHEETS.ENQUIRY_TRACKER}!F${rowNum}`, values: [[updatedAt]] },
      ])
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[enquiries PATCH]", err)
    return NextResponse.json({ error: "Failed to update enquiry" }, { status: 500 })
  }
}
