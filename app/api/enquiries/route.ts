import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSheetValues } from "@/lib/sheets"
import { parseEnquiry } from "@/lib/sheets-helpers"
import { SHEET_ID, ENQUIRY_SHEET_ID, SHEETS, COLS } from "@/constants"
import type { Enquiry } from "@/types/guidance"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role === "DR") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
  const [enquiryRows, trackerRows, userRows] = await Promise.all([
    getSheetValues(ENQUIRY_SHEET_ID, "Form responses 1"),
    getSheetValues(SHEET_ID, SHEETS.ENQUIRY_TRACKER).catch(() => [] as string[][]),
    getSheetValues(SHEET_ID, SHEETS.USERS).catch(() => [] as string[][]),
  ])

  // Build SE email → name map from Users sheet (Role = SE)
  const seByEmail: Record<string, string> = {}
  userRows.slice(1).forEach((r) => {
    const email = (r[COLS.USER.EMAIL] ?? "").toLowerCase().trim()
    const role = (r[COLS.USER.ROLE] ?? "").trim()
    const name = (r[COLS.USER.FULL_NAME] ?? "").trim()
    if ((role === "SE" || role === "DR") && email && name) seByEmail[email] = name
  })

  // Build tracker lookup: key → { status, note, updatedBy, updatedAt }
  const tracker: Record<string, { status: string; note: string; updatedBy: string; updatedAt: string }> = {}
  trackerRows.slice(1).forEach((r) => {
    const key = r[COLS.ENQUIRY_TRACKER.KEY]
    if (key) tracker[key] = {
      status: r[COLS.ENQUIRY_TRACKER.STATUS] ?? "New",
      note: r[COLS.ENQUIRY_TRACKER.NOTE] ?? "",
      updatedBy: r[COLS.ENQUIRY_TRACKER.UPDATED_BY] ?? "",
      updatedAt: r[COLS.ENQUIRY_TRACKER.UPDATED_AT] ?? "",
    }
  })

  let enquiries: Enquiry[] = enquiryRows.slice(1)
    .filter((row) => row[COLS.ENQUIRY.CLIENT_CODE])
    .map((row) => {
      const key = `${row[COLS.ENQUIRY.CLIENT_CODE]}-${row[COLS.ENQUIRY.TIMESTAMP]}`
      const base = parseEnquiry(row, key)
      const t = tracker[key]
      const seEmail = (row[COLS.ENQUIRY.EMAIL] ?? "").toLowerCase().trim()
      const seName = seByEmail[seEmail] || seEmail
      return {
        ...base,
        seName,
        status: t?.status ?? "New",
        trackerNote: t?.note,
        updatedBy: t?.updatedBy,
        updatedAt: t?.updatedAt,
      }
    })

  // Role-based filter
  if (session.user.role === "SE") {
    const seName = (session.user.fullName ?? "").trim().toLowerCase()
    enquiries = enquiries.filter((e) => (e.seName ?? "").trim().toLowerCase() === seName)
  } else if (session.user.role !== "Admin") {
    const kamName = (session.user.kamName ?? "").trim().toLowerCase()
    enquiries = enquiries.filter((e) =>
      (e.teamName ?? "").trim().toLowerCase() === kamName
    )
  }

  return NextResponse.json(enquiries)
  } catch (err) {
    console.error("[enquiries GET]", err)
    return NextResponse.json({ error: "Failed to load enquiries" }, { status: 500 })
  }
}
