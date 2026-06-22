import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSheetValues, appendRow } from "@/lib/sheets"
import { parseTarget } from "@/lib/sheets-helpers"
import { SHEET_ID, ENQUIRY_SHEET_ID, SHEETS, COLS } from "@/constants"
import { esc, parsePeriod, parseFlexDate, getCurrentPeriod } from "@/lib/utils"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
  const { searchParams } = req.nextUrl
  const period = searchParams.get("period")

  const [targetRows, enquiryRows, userRows] = await Promise.all([
    getSheetValues(SHEET_ID, SHEETS.TARGETS),
    getSheetValues(ENQUIRY_SHEET_ID, "Form responses 1"),
    getSheetValues(SHEET_ID, SHEETS.USERS).catch(() => [] as string[][]),
  ])

  // Build SE email → name map so enquiry rows can be filtered by SE name
  const seByEmail: Record<string, string> = {}
  userRows.slice(1).forEach((r) => {
    const email = (r[COLS.USER.EMAIL] ?? "").toLowerCase().trim()
    const name = (r[COLS.USER.FULL_NAME] ?? "").trim()
    if (email && name) seByEmail[email] = name
  })

  let data = targetRows.slice(1).map((row, i) => parseTarget(row, i + 2))

  if (session.user.role !== "Admin") {
    data = data.filter((t) => t.kam === session.user.kamName)
  }

  if (period) {
    const periodData = data.filter((t) => t.period === period)

    // Enquiries targets carry forward automatically: if a client has no Enquiries
    // target for this period, inherit the most recently added one (highest rowNum).
    const allEnquiry = data.filter((t) => t.type === "Enquiries")
    const hasEnqThisPeriod = new Set(
      periodData.filter((t) => t.type === "Enquiries").map((t) => `${t.clientId}|${t.seName ?? ""}`)
    )
    const latestEnqByKey: Record<string, typeof allEnquiry[0]> = {}
    allEnquiry.forEach((t) => {
      const key = `${t.clientId}|${t.seName ?? ""}`
      if (!latestEnqByKey[key] || t.rowNum > latestEnqByKey[key].rowNum) {
        latestEnqByKey[key] = t
      }
    })
    const inherited = Object.values(latestEnqByKey)
      .filter((t) => !hasEnqThisPeriod.has(`${t.clientId}|${t.seName ?? ""}`))
      .map((t) => ({ ...t, period }))

    data = [...periodData, ...inherited]
  }

  // Auto-compute enquiry counts for Enquiries type (uses target.period for date range)
  const enriched = data.map((target) => {
    if (target.type !== "Enquiries") return target
    const range = parsePeriod(target.period)
    if (!range) return target

    const seName = (target.seName ?? "").trim().toLowerCase()
    const count = enquiryRows.slice(1).filter((r) => {
      const clientCode = r[COLS.ENQUIRY.CLIENT_CODE]
      // Use ENQUIRY_DATE if filled, otherwise fall back to form TIMESTAMP
      const dateStr = r[COLS.ENQUIRY.ENQUIRY_DATE] || r[COLS.ENQUIRY.TIMESTAMP]
      if (clientCode !== target.clientId) return false
      // Filter by SE: resolve the submitter email (col A) to a name via Users sheet
      if (seName && seName !== "—") {
        const email = (r[COLS.ENQUIRY.EMAIL] ?? "").toLowerCase().trim()
        const resolvedSE = (seByEmail[email] ?? "").toLowerCase()
        if (resolvedSE !== seName) return false
      }
      const d = parseFlexDate(dateStr)
      return d !== null && d >= range.start && d <= range.end
    }).length

    return { ...target, enquiryCount: count }
  })

  return NextResponse.json(enriched)
  } catch (err) {
    console.error("[targets GET]", err)
    return NextResponse.json({ error: "Failed to load targets" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "Admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const body = await req.json()
    const { period, kam, seName, clientId, company, target, type, notes } = body

    await appendRow(SHEET_ID, SHEETS.TARGETS, [
      esc(period ?? getCurrentPeriod()), esc(kam), esc(seName ?? ""),
      esc(clientId), esc(company), esc(String(target ?? 0)),
      "0", "0%", "Open", esc(notes ?? ""), esc(type ?? "Visits"),
    ])

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[targets POST]", err)
    return NextResponse.json({ error: "Failed to save target" }, { status: 500 })
  }
}
