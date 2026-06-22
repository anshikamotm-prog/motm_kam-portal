import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { batchUpdate } from "@/lib/sheets"
import { SHEET_ID, SHEETS } from "@/constants"
import { esc, nowIST } from "@/lib/utils"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const rowNum = parseInt(id, 10)
  if (isNaN(rowNum)) return NextResponse.json({ error: "Invalid" }, { status: 400 })

  await batchUpdate(SHEET_ID, [
    { range: `${SHEETS.NOTIFICATION_LOG}!J${rowNum}`, values: [["Yes"]] },
    { range: `${SHEETS.NOTIFICATION_LOG}!K${rowNum}`, values: [[esc(session.user.name ?? "")]] },
    { range: `${SHEETS.NOTIFICATION_LOG}!L${rowNum}`, values: [[nowIST()]] },
  ])

  return NextResponse.json({ success: true })
}
