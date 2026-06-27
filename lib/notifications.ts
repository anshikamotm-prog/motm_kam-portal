import type { Client } from "@/types/client"
import type { Meeting } from "@/types/meeting"
import type { Task } from "@/types/task"
import { getSheetValues, appendRow } from "@/lib/sheets"
import { SHEET_ID, SHEETS, COLS } from "@/constants"
import { nowIST, daysSince, parseFlexDate, esc } from "@/lib/utils"

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
    // nowIST() returns "DD/MM/YYYY, HH:MM:SS" — parseFlexDate handles the date part (H-3)
    const ts = parseFlexDate(r[COLS.NOTIFICATION.TIMESTAMP])?.getTime() ?? NaN
    return !isNaN(ts) && ts > cutoff
  })
  if (exists) return

  await appendRow(SHEET_ID, SHEETS.NOTIFICATION_LOG, [
    nowIST(),
    params.type,
    params.severity,
    esc(params.clientId),
    esc(params.company),
    esc(params.kam),
    esc(params.message), // L-6: esc prevents formula injection from sheet-derived values
    params.emailSent ?? "No",
    params.emailTo ?? "",
    "No",
    "",
    "",
  ])
}

export async function markMissedMeetings(meetings: Meeting[]): Promise<Meeting[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  // H-4: use parseFlexDate so DD/MM/YYYY meeting dates compare correctly
  const toMiss = meetings.filter((m) => {
    if (m.status !== "Scheduled" || !m.date) return false
    const d = parseFlexDate(m.date)
    return d !== null && d < today
  })
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
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  // H-5: use parseFlexDate so DD/MM/YYYY due dates compare correctly
  return tasks.filter((t) => {
    if (["Done", "Completed", "Cancelled"].includes(t.status)) return false
    if (!t.dueDate) return false
    const d = parseFlexDate(t.dueDate)
    return d !== null && d < today
  })
}
