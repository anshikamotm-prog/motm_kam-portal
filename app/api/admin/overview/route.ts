import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSheetValues } from "@/lib/sheets"
import { parseClient, parseMeeting, parseTask } from "@/lib/sheets-helpers"
import { SHEET_ID, SHEETS } from "@/constants"
import { daysSince } from "@/lib/utils"
import { getKAMNames } from "@/lib/getKAMNames"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "Admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const [clientRows, meetingRows, taskRows, kamNames] = await Promise.all([
      getSheetValues(SHEET_ID, SHEETS.CLIENT_MASTER),
      getSheetValues(SHEET_ID, SHEETS.MEETING_SCHEDULE),
      getSheetValues(SHEET_ID, SHEETS.TASK_TRACKER),
      getKAMNames(),
    ])

    const allClients = clientRows.slice(1).map((r, i) => parseClient(r, i + 2))
    const meetings = meetingRows.slice(1).map((r, i) => parseMeeting(r, i + 2))
    const tasks = taskRows.slice(1).map((r, i) => parseTask(r, i + 2))

    const INACTIVE = ["Closed", "On Hold", "Uncountable"]
    const clients = allClients.filter((c) => !INACTIVE.includes(c.status))
    const inactiveClients = allClients.filter((c) => INACTIVE.includes(c.status))

    const stats = {
      total: clients.length,
      green: clients.filter((c) => c.health === "Green").length,
      orange: clients.filter((c) => c.health === "Orange").length,
      red: clients.filter((c) => c.health === "Red").length,
      planningToLeave: clients.filter((c) => c.feedbackStatus === "Planning to Leave").length,
      intentToLeave: clients.filter((c) => c.feedbackStatus === "Intent to Leave").length,
      overdueFollowup: clients.filter((c) => {
        const d = daysSince(c.lastFeedbackDate)
        return d !== null && d > 7
      }).length,
      monthRevenue: clients.reduce((sum, c) => sum + (parseFloat(c.monthlyValue) || 0), 0),
    }

    const kamBreakdown = kamNames.map((kam) => {
      const mine = clients.filter((c) => c.kam === kam)
      const mineAll = allClients.filter((c) => c.kam === kam)
      return {
        kam,
        total: mine.length,
        green: mine.filter((c) => c.health === "Green").length,
        orange: mine.filter((c) => c.health === "Orange").length,
        red: mine.filter((c) => c.health === "Red").length,
        onHold: mineAll.filter((c) => c.status === "On Hold").length,
        atRisk: mine.filter((c) => ["Intent to Leave", "Planning to Leave", "At Risk"].includes(c.feedbackStatus)).length,
        overdue: mine.filter((c) => {
          const d = daysSince(c.lastFeedbackDate)
          return d !== null && d > 7
        }).length,
      }
    })

    const criticalClients = clients
      .filter((c) => c.health === "Red" || c.feedbackStatus === "Intent to Leave" || c.feedbackStatus === "Planning to Leave")
      .map((c) => ({
        clientId: c.clientId, company: c.company, kam: c.kam, health: c.health,
        feedbackStatus: c.feedbackStatus, lastFeedbackDate: c.lastFeedbackDate,
        daysSince: daysSince(c.lastFeedbackDate),
      }))
      .sort((a, b) => (b.daysSince ?? 0) - (a.daysSince ?? 0))
      .slice(0, 20)

    const otherClients = INACTIVE.map((status) => ({
      status,
      clients: inactiveClients
        .filter((c) => c.status === status)
        .map((c) => ({ clientId: c.clientId, company: c.company, kam: c.kam })),
    })).filter((g) => g.clients.length > 0)

    const ONBOARDING = ["New", "Pending"]
    const onboardingClients = ONBOARDING.map((status) => ({
      status,
      clients: clients
        .filter((c) => c.status === status)
        .map((c) => ({ clientId: c.clientId, company: c.company, kam: c.kam })),
    })).filter((g) => g.clients.length > 0)

    const unassignedClients = clients
      .filter((c) => !c.kam || c.kam.trim() === "")
      .map((c) => ({ clientId: c.clientId, company: c.company, status: c.status }))

    return NextResponse.json({ stats, kamBreakdown, criticalClients, otherClients, onboardingClients, unassignedClients })
  } catch (err) {
    console.error("[admin/overview GET]", err)
    return NextResponse.json({ error: "Failed to load overview" }, { status: 500 })
  }
}
