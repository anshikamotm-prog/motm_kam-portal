import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSheetValues } from "@/lib/sheets"
import { parseTarget } from "@/lib/sheets-helpers"
import { SHEET_ID, ENQUIRY_SHEET_ID, SHEETS, COLS } from "@/constants"
import { parsePeriod, parseFlexDate } from "@/lib/utils"
import type { Target } from "@/types/target"

function getWeeksInMonth(monthStr: string): string[] {
  const m = monthStr.match(/^([A-Za-z]{3})\s+(\d{4})$/i)
  if (!m) return []
  const moIdx = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"]
    .indexOf(m[1].toLowerCase())
  if (moIdx === -1) return []
  const yr = +m[2]
  const daysInMonth = new Date(yr, moIdx + 1, 0).getDate()
  const numWeeks = Math.ceil(daysInMonth / 7)
  return Array.from({ length: numWeeks }, (_, i) => `${m[1]} ${yr} W${i + 1}`)
}

function applyCarryForward(allTargets: Target[], period: string): Target[] {
  const periodData = allTargets.filter((t) => t.period === period)
  const allEnquiry = allTargets.filter((t) => t.type === "Enquiries")
  const hasEnqThisPeriod = new Set(
    periodData.filter((t) => t.type === "Enquiries").map((t) => `${t.clientId}|${t.seName ?? ""}`)
  )
  const latestByKey: Record<string, Target> = {}
  allEnquiry.forEach((t) => {
    const key = `${t.clientId}|${t.seName ?? ""}`
    if (!latestByKey[key] || t.rowNum > latestByKey[key].rowNum) latestByKey[key] = t
  })
  const inherited = Object.values(latestByKey)
    .filter((t) => !hasEnqThisPeriod.has(`${t.clientId}|${t.seName ?? ""}`))
    .map((t) => ({ ...t, period }))
  return [...periodData, ...inherited]
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
  const period = req.nextUrl.searchParams.get("period") ?? ""
  const isMonthly = !!period && !period.match(/W\d+$/i)

  const [targetRows, enquiryRows, userRows] = await Promise.all([
    getSheetValues(SHEET_ID, SHEETS.TARGETS),
    getSheetValues(ENQUIRY_SHEET_ID, "Form responses 1"),
    getSheetValues(SHEET_ID, SHEETS.USERS).catch(() => [] as string[][]),
  ])

  const seByEmail: Record<string, string> = {}
  userRows.slice(1).forEach((r) => {
    const email = (r[COLS.USER.EMAIL] ?? "").toLowerCase().trim()
    const name = (r[COLS.USER.FULL_NAME] ?? "").trim()
    if (email && name) seByEmail[email] = name
  })

  let allTargets = targetRows.slice(1).map((row, i) => parseTarget(row, i + 2))
  if (session.user.role === "SE") {
    allTargets = allTargets.filter((t) => t.seName === session.user.fullName)
  } else if (session.user.role !== "Admin") {
    allTargets = allTargets.filter((t) => t.kam === session.user.kamName)
  }

  const periodsToProcess = isMonthly ? getWeeksInMonth(period) : (period ? [period] : [])

  type SEData = { target: number; achieved: number }
  type KAMData = { target: number; achieved: number; bySE: Record<string, SEData> }
  const kamMap: Record<string, KAMData> = {}

  for (const p of periodsToProcess) {
    const range = parsePeriod(p)
    if (!range) continue

    const periodTargets = applyCarryForward(allTargets, p).filter((t) => t.type === "Enquiries")

    for (const target of periodTargets) {
      const k = target.kam || "Unassigned"
      const se = (target.seName || "No SE").trim()
      if (!kamMap[k]) kamMap[k] = { target: 0, achieved: 0, bySE: {} }
      if (!kamMap[k].bySE[se]) kamMap[k].bySE[se] = { target: 0, achieved: 0 }

      const tgtVal = parseInt(target.target) || 0
      kamMap[k].target += tgtVal
      kamMap[k].bySE[se].target += tgtVal

      const seName = (target.seName ?? "").trim().toLowerCase()
      const count = enquiryRows.slice(1).filter((r) => {
        if (r[COLS.ENQUIRY.CLIENT_CODE] !== target.clientId) return false
        if (seName && seName !== "—") {
          const email = (r[COLS.ENQUIRY.EMAIL] ?? "").toLowerCase().trim()
          if ((seByEmail[email] ?? "").toLowerCase() !== seName) return false
        }
        const d = parseFlexDate(r[COLS.ENQUIRY.ENQUIRY_DATE] || r[COLS.ENQUIRY.TIMESTAMP])
        return d !== null && d >= range.start && d <= range.end
      }).length

      kamMap[k].achieved += count
      kamMap[k].bySE[se].achieved += count
    }
  }

  const byKAM = Object.entries(kamMap).map(([kam, data]) => ({
    kam,
    target: data.target,
    achieved: data.achieved,
    pct: data.target > 0 ? Math.round((data.achieved / data.target) * 100) : 0,
    bySE: Object.entries(data.bySE)
      .map(([se, v]) => ({
        se,
        target: v.target,
        achieved: v.achieved,
        pct: v.target > 0 ? Math.round((v.achieved / v.target) * 100) : 0,
      }))
      .sort((a, b) => a.se.localeCompare(b.se)),
  })).sort((a, b) => a.kam.localeCompare(b.kam))

  const totalTarget = byKAM.reduce((s, k) => s + k.target, 0)
  const totalAchieved = byKAM.reduce((s, k) => s + k.achieved, 0)

  return NextResponse.json({
    period,
    isMonthly,
    byKAM,
    total: {
      target: totalTarget,
      achieved: totalAchieved,
      pct: totalTarget > 0 ? Math.round((totalAchieved / totalTarget) * 100) : 0,
    },
  })
  } catch (err) {
    console.error("[targets/summary GET]", err)
    return NextResponse.json({ error: "Failed to load summary" }, { status: 500 })
  }
}
