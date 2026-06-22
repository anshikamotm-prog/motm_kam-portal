import type { Client } from "@/types/client"
import type { Meeting } from "@/types/meeting"
import type { Task } from "@/types/task"
import { getSheetValues, appendRow } from "@/lib/sheets"
import { SHEET_ID, SHEETS, COLS } from "@/constants"
import { nowIST, daysSince } from "@/lib/utils"

export async function logNotification(params: {
  type: string
  severity: string
  clientId: string
  company: string
  kam: string
  message: string
  emailSent?: string
  emailTo?: string
}): Promise<void> {
  // De-duplicate: skip if same type+clientId already logged in last 24h
  const rows = await getSheetValues(SHEET_ID, SHEETS.NOTIFICATION_LOG)
  const cutoff = Date.now() - 24 * 60 * 60 * 1000
  const exists = rows.slice(1).some((r) => {
    if (r[COLS.NOTIFICATION.TYPE] !== params.type) return false
    if (r[COLS.NOTIFICATION.CLIENT_ID] !== params.clientId) return false
    const ts = new Date(r[COLS.NOTIFICATION.TIMESTAMP]).getTime()
    return !isNaN(ts) && ts > cutoff
  })
  if (exists) return

  await appendRow(SHEET_ID, SHEETS.NOTIFICATION_LOG, [
    nowIST(),
    params.type,
    params.severity,
    params.clientId,
    params.company,
    params.kam,
    params.message,
    params.emailSent ?? "No",
    params.emailTo ?? "",
    "No",
    "",
    "",
  ])
}

export async function markMissedMeetings(meetings: Meeting[]): Promise<Meeting[]> {
  const today = new Date().toISOString().split("T")[0]
  const toMiss = meetings.filter(
    (m) => m.status === "Scheduled" && m.date && m.date < today,
  )
  if (toMiss.length === 0) return meetings

  const { updateCell } = await import("@/lib/sheets")
  for (const m of toMiss) {
    await updateCell(SHEET_ID, SHEETS.MEETING_SCHEDULE, m.rowNum, COLS.MEETING.STATUS + 1, "Missed")
    await logNotification({
      type: "MISSED_MEETING",
      severity: "High",
      clientId: m.clientId,
      company: m.company,
      kam: m.kam,
      message: `Meeting "${m.title}" scheduled for ${m.date} was missed.`,
    })
    m.status = "Missed"
  }
  return meetings
}

export function checkFeedbackOverdue(clients: Client[]): {
  overdue7: Client[]
  overdue14: Client[]
} {
  const overdue7 = clients.filter((c) => {
    const d = daysSince(c.lastFeedbackDate)
    return d !== null && d >= 7
  })
  const overdue14 = clients.filter((c) => {
    const d = daysSince(c.lastFeedbackDate)
    return d !== null && d >= 14
  })
  return { overdue7, overdue14 }
}

export function checkOverdueTasks(tasks: Task[]): Task[] {
  const today = new Date().toISOString().split("T")[0]
  return tasks.filter(
    (t) =>
      t.status !== "Done" &&
      t.status !== "Completed" &&
      t.status !== "Cancelled" &&
      t.dueDate &&
      t.dueDate < today,
  )
}
