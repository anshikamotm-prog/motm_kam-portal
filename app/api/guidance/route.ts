import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSheetValues, appendRow } from "@/lib/sheets"
import { parseAdminNote } from "@/lib/sheets-helpers"
import { SHEET_ID, SHEETS, COLS } from "@/constants"
import { esc, nowIST, parseFlexDate } from "@/lib/utils"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role === "SE" || session.user.role === "DR") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { searchParams } = req.nextUrl
  const clientId = searchParams.get("clientId")
  const kam = searchParams.get("kam")

  const rows = await getSheetValues(SHEET_ID, SHEETS.ADMIN_NOTES)
  let data = rows.slice(1).map((row, i) => parseAdminNote(row, i + 2))

  if (session.user.role !== "Admin") {
    data = data.filter((n) => n.kamAssigned === session.user.kamName)
  } else if (kam) {
    data = data.filter((n) => n.kamAssigned === kam)
  }

  if (clientId) data = data.filter((n) => n.clientId === clientId)

  data.sort((a, b) => (parseFlexDate(b.timestamp)?.getTime() ?? 0) - (parseFlexDate(a.timestamp)?.getTime() ?? 0))
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "Admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { clientId, company, kamAssigned, note } = body

  if (!note) return NextResponse.json({ error: "note is required" }, { status: 400 })

  await appendRow(SHEET_ID, SHEETS.ADMIN_NOTES, [
    nowIST(), esc(clientId ?? ""), esc(company ?? ""), esc(kamAssigned ?? ""),
    esc(note), esc(session.user.name ?? ""), "No", "", "", "", "",
  ])

  return NextResponse.json({ success: true })
}
