import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSheetValues, batchUpdate } from "@/lib/sheets"
import { SHEET_ID, SHEETS, COLS } from "@/constants"
import { esc, nowIST } from "@/lib/utils"

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role === "SE" || session.user.role === "DR") return NextResponse.json({ success: true, count: 0 })

  const rows = await getSheetValues(SHEET_ID, SHEETS.NOTIFICATION_LOG)
  const dataRows = rows.slice(1)

  const ackBy = esc(session.user.name ?? "")
  const ackAt = nowIST()
  const updates: { range: string; values: string[][] }[] = []

  dataRows.forEach((row, i) => {
    const rowNum = i + 2
    const isForUser = session.user.role === "Admin" || row[COLS.NOTIFICATION.KAM] === session.user.kamName
    const isAcked = row[COLS.NOTIFICATION.ACKNOWLEDGED] === "Yes"
    if (isForUser && !isAcked) {
      updates.push({ range: `${SHEETS.NOTIFICATION_LOG}!J${rowNum}`, values: [["Yes"]] })
      updates.push({ range: `${SHEETS.NOTIFICATION_LOG}!K${rowNum}`, values: [[ackBy]] })
      updates.push({ range: `${SHEETS.NOTIFICATION_LOG}!L${rowNum}`, values: [[ackAt]] })
    }
  })

  if (updates.length > 0) {
    await batchUpdate(SHEET_ID, updates)
  }

  return NextResponse.json({ success: true, count: updates.length / 3 })
}
