import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSheetValues } from "@/lib/sheets"
import { parseUser } from "@/lib/sheets-helpers"
import { SHEET_ID, SHEETS } from "@/constants"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "Admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const rows = await getSheetValues(SHEET_ID, SHEETS.USERS)
  const data = rows.slice(1).map((r, i) => parseUser(r, i + 2))
  return NextResponse.json(data)
}
