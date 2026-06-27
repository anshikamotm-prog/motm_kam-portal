import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSheetValues, appendRow, batchUpdate } from "@/lib/sheets"
import { parseMeeting } from "@/lib/sheets-helpers"
import { SHEET_ID, SHEETS, COLS } from "@/constants"
import { esc, nowIST, parseFlexDate } from "@/lib/utils"
import { markMissedMeetings } from "@/lib/notifications"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = req.nextUrl
  const filterKam = searchParams.get("kam")
  const filterStatus = searchParams.get("status")
  const dateFrom = searchParams.get("dateFrom")
  const dateTo = searchParams.get("dateTo")

  const rows = await getSheetValues(SHEET_ID, SHEETS.MEETING_SCHEDULE)
  let data = rows.slice(1).map((row, i) => parseMeeting(row, i + 2))

  // Auto-mark missed meetings
  data = await markMissedMeetings(data)

  // Role filter
  if (session.user.role === "SE" || session.user.role === "DR") {
    data = data.filter((m) => m.se === session.user.fullName)
  } else if (session.user.role !== "Admin") {
    data = data.filter((m) => m.kam === session.user.kamName)
  } else if (filterKam) {
    data = data.filter((m) => m.kam === filterKam)
  }

  if (filterStatus) data = data.filter((m) => m.status === filterStatus)
  // H-7: use parseFlexDate so DD/MM/YYYY meeting dates filter and sort correctly
  if (dateFrom) {
    const from = parseFlexDate(dateFrom)
    if (from) data = data.filter((m) => { const d = parseFlexDate(m.date); return d !== null && d >= from })
  }
  if (dateTo) {
    const to = parseFlexDate(dateTo)
    if (to) data = data.filter((m) => { const d = parseFlexDate(m.date); return d !== null && d <= to })
  }

  data.sort((a, b) => {
    const da = parseFlexDate(a.date)?.getTime() ?? 0
    const db = parseFlexDate(b.date)?.getTime() ?? 0
    return db - da
  })

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role === "SE" || session.user.role === "DR") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const { title, clientId, company, meetingType, date, time, participants, notes } = body

  if (!title || !date) {
    return NextResponse.json({ error: "title and date are required" }, { status: 400 })
  }

  const kam = session.user.role === "Admin" ? (body.kam ?? session.user.kamName) : session.user.kamName
  const se = body.se ?? ""
  const meetingId = `MTG-${Date.now()}`
  const createdAt = nowIST()

  await appendRow(SHEET_ID, SHEETS.MEETING_SCHEDULE, [
    meetingId, esc(title), esc(clientId ?? ""), esc(company ?? ""),
    esc(kam), esc(se), esc(meetingType ?? ""), esc(date), esc(time ?? ""),
    esc(participants ?? ""), "Scheduled",
    "", "", "", "", "", "", "", "", esc(session.user.name ?? ""),
    createdAt, esc(notes ?? ""),
  ])

  return NextResponse.json({ success: true, meetingId })
}
