import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSheetValues, appendRow } from "@/lib/sheets"
import { SHEET_ID, SHEETS, COLS, EMAIL_RESPONSE_TYPES } from "@/constants"
import { esc, nowIST, getCurrentPeriod, parseFlexDate } from "@/lib/utils"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  // L-3: DR can read their own logged responses
  if (session.user.role !== "Admin" && session.user.role !== "DR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const filterKam = searchParams.get("kam")
  const filterDR = searchParams.get("dr")
  const filterClient = searchParams.get("clientId")
  const filterPeriod = searchParams.get("period")
  const filterType = searchParams.get("responseType")

  const rows = await getSheetValues(SHEET_ID, SHEETS.EMAIL_RESPONSE_LOG)
  let data = rows.slice(1).map((r, i) => ({
    rowNum: i + 2,
    timestamp: r[COLS.EMAIL_RESPONSE.TIMESTAMP] ?? "",
    period: r[COLS.EMAIL_RESPONSE.PERIOD] ?? "",
    clientId: r[COLS.EMAIL_RESPONSE.CLIENT_ID] ?? "",
    company: r[COLS.EMAIL_RESPONSE.COMPANY] ?? "",
    kam: r[COLS.EMAIL_RESPONSE.KAM] ?? "",
    drName: r[COLS.EMAIL_RESPONSE.DR_NAME] ?? "",
    contactPerson: r[COLS.EMAIL_RESPONSE.CONTACT_PERSON] ?? "",
    designation: r[COLS.EMAIL_RESPONSE.DESIGNATION] ?? "",
    contactEmail: r[COLS.EMAIL_RESPONSE.CONTACT_EMAIL] ?? "",
    responseDate: r[COLS.EMAIL_RESPONSE.RESPONSE_DATE] ?? "",
    responseType: r[COLS.EMAIL_RESPONSE.RESPONSE_TYPE] ?? "",
    responseSummary: r[COLS.EMAIL_RESPONSE.RESPONSE_SUMMARY] ?? "",
    nextAction: r[COLS.EMAIL_RESPONSE.NEXT_ACTION] ?? "",
    notes: r[COLS.EMAIL_RESPONSE.NOTES] ?? "",
  }))

  // DR sees only their own responses
  if (session.user.role === "DR") {
    data = data.filter((r) => r.drName === session.user.fullName)
  }

  if (filterKam) data = data.filter((r) => r.kam === filterKam)
  if (filterDR) data = data.filter((r) => r.drName === filterDR)
  if (filterClient) data = data.filter((r) => r.clientId === filterClient)
  if (filterPeriod) data = data.filter((r) => r.period === filterPeriod)
  if (filterType) data = data.filter((r) => r.responseType === filterType)

  data.sort((a, b) => (parseFlexDate(b.timestamp)?.getTime() ?? 0) - (parseFlexDate(a.timestamp)?.getTime() ?? 0))
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "DR") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const {
    period, clientId, company,
    contactPerson, designation, contactEmail,
    responseDate, responseType, responseSummary, nextAction, notes,
  } = body

  if (!clientId || !contactPerson || !responseType || !responseSummary) {
    return NextResponse.json(
      { error: "clientId, contactPerson, responseType, and responseSummary are required" },
      { status: 400 },
    )
  }
  // L-2: validate responseType against allowed values
  if (!(EMAIL_RESPONSE_TYPES as readonly string[]).includes(responseType)) {
    return NextResponse.json({ error: `responseType must be one of: ${EMAIL_RESPONSE_TYPES.join(", ")}` }, { status: 400 })
  }

  // Verify the client belongs to this DR's KAM team
  const clientRows = await getSheetValues(SHEET_ID, SHEETS.CLIENT_MASTER)
  const clientRow = clientRows.slice(1).find((r) => r[COLS.CLIENT.ID] === clientId)
  if (!clientRow) return NextResponse.json({ error: "Client not found" }, { status: 404 })
  if (clientRow[COLS.CLIENT.KAM] !== session.user.kamName) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const activePeriod = period ?? getCurrentPeriod()
  const kam = clientRow[COLS.CLIENT.KAM] ?? session.user.kamName

  await appendRow(SHEET_ID, SHEETS.EMAIL_RESPONSE_LOG, [
    nowIST(),
    esc(activePeriod),
    esc(clientId),
    esc(company ?? clientRow[COLS.CLIENT.COMPANY] ?? ""),
    esc(kam),
    esc(session.user.fullName ?? ""),
    esc(contactPerson),
    esc(designation ?? ""),
    esc(contactEmail ?? ""),
    esc(responseDate ?? ""),
    esc(responseType),
    esc(responseSummary),
    esc(nextAction ?? ""),
    esc(notes ?? ""),
  ])

  return NextResponse.json({ success: true })
}
