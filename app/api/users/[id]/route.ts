import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSheetValues, appendRow, batchUpdate } from "@/lib/sheets"
import { SHEET_ID, SHEETS, COLS } from "@/constants"
import { esc } from "@/lib/utils"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "Admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const { email, fullName, role, kamName, active } = body

  if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 })

  const rows = await getSheetValues(SHEET_ID, SHEETS.USERS)

  if (id === "new") {
    await appendRow(SHEET_ID, SHEETS.USERS, [
      esc(email), esc(fullName ?? ""), esc(role ?? "KAM"), esc(kamName ?? ""), esc(active ?? "Yes"),
    ])
  } else {
    const rowNum = parseInt(id, 10)
    if (isNaN(rowNum)) return NextResponse.json({ error: "Invalid id" }, { status: 400 })
    await batchUpdate(SHEET_ID, [
      { range: `${SHEETS.USERS}!A${rowNum}`, values: [[esc(email)]] },
      { range: `${SHEETS.USERS}!B${rowNum}`, values: [[esc(fullName ?? "")]] },
      { range: `${SHEETS.USERS}!C${rowNum}`, values: [[esc(role ?? "KAM")]] },
      { range: `${SHEETS.USERS}!D${rowNum}`, values: [[esc(kamName ?? "")]] },
      { range: `${SHEETS.USERS}!E${rowNum}`, values: [[esc(active ?? "Yes")]] },
    ])
  }

  return NextResponse.json({ success: true })
}
