import { NextRequest, NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"
import { getSheetValues } from "@/lib/sheets"
import { parseClient, parseMeeting, parseTask } from "@/lib/sheets-helpers"
import { SHEET_ID, SHEETS } from "@/constants"
import { logNotification, checkFeedbackOverdue, checkOverdueTasks, markMissedMeetings } from "@/lib/notifications"
import { daysSince, nowIST } from "@/lib/utils"

export async function POST(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "") ?? ""
  const expected = process.env.CRON_SECRET ?? ""
  const valid = expected.length > 0 &&
    secret.length === expected.length &&
    timingSafeEqual(Buffer.from(secret), Buffer.from(expected))
  if (!valid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [clientRows, meetingRows, taskRows] = await Promise.all([
    getSheetValues(SHEET_ID, SHEETS.CLIENT_MASTER),
    getSheetValues(SHEET_ID, SHEETS.MEETING_SCHEDULE),
    getSheetValues(SHEET_ID, SHEETS.TASK_TRACKER),
  ])

  const clients = clientRows.slice(1).map((r, i) => parseClient(r, i + 2))
  let meetings = meetingRows.slice(1).map((r, i) => parseMeeting(r, i + 2))
  const tasks = taskRows.slice(1).map((r, i) => parseTask(r, i + 2))

  // 1. Auto-mark missed meetings
  meetings = await markMissedMeetings(meetings)

  // 2. Feedback overdue notifications
  const { overdue7, overdue14 } = checkFeedbackOverdue(clients)
  for (const c of overdue7) {
    await logNotification({
      type: "FEEDBACK_OVERDUE_7",
      severity: "Medium",
      clientId: c.clientId,
      company: c.company,
      kam: c.kam,
      message: `No feedback for ${daysSince(c.lastFeedbackDate)} days for ${c.company}.`,
    })
  }
  for (const c of overdue14) {
    await logNotification({
      type: "FEEDBACK_OVERDUE_14",
      severity: "High",
      clientId: c.clientId,
      company: c.company,
      kam: c.kam,
      message: `CRITICAL: No feedback for ${daysSince(c.lastFeedbackDate)} days for ${c.company}.`,
    })
  }

  // 3. MOM Pending notifications
  const pendingMOM = meetings.filter((m) => m.status === "Pending Documentation")
  for (const m of pendingMOM) {
    await logNotification({
      type: "MOM_PENDING",
      severity: "Medium",
      clientId: m.clientId,
      company: m.company,
      kam: m.kam,
      message: `MOM pending for meeting: "${m.title}" on ${m.date}.`,
    })
  }

  // 4. Overdue tasks
  const overdueTasks = checkOverdueTasks(tasks)
  for (const t of overdueTasks) {
    await logNotification({
      type: "TASK_OVERDUE",
      severity: "High",
      clientId: t.clientId,
      company: t.company,
      kam: t.kam,
      message: `Task overdue: "${t.title}" was due ${t.dueDate}.`,
    })
  }

  // 5. Client neglect: no activity for 15+ days
  for (const c of clients) {
    const lastFeedback = daysSince(c.lastFeedbackDate) ?? 999
    const lastMeeting = meetings
      .filter((m) => m.clientId === c.clientId)
      .map((m) => daysSince(m.date) ?? 999)
    const minActivity = Math.min(lastFeedback, ...lastMeeting)
    if (minActivity >= 15) {
      await logNotification({
        type: "CLIENT_NEGLECT",
        severity: "Critical",
        clientId: c.clientId,
        company: c.company,
        kam: c.kam,
        message: `No activity for ${minActivity} days: ${c.company}.`,
      })
    }
  }

  return NextResponse.json({
    success: true,
    ran: nowIST(),
    feedback7: overdue7.length,
    feedback14: overdue14.length,
    pendingMOM: pendingMOM.length,
    overdueTasks: overdueTasks.length,
  })
}
