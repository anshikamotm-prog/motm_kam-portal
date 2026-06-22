import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSheetValues } from "@/lib/sheets"
import { parseFeedback, parseMeeting, parseTask, parseAdminNote } from "@/lib/sheets-helpers"
import { SHEET_ID, SHEETS, COLS } from "@/constants"
import type { TimelineEvent } from "@/types/guidance"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { clientId } = await params

  const [feedbackRows, meetingRows, taskRows, noteRows] = await Promise.all([
    getSheetValues(SHEET_ID, SHEETS.FEEDBACK_LOG),
    getSheetValues(SHEET_ID, SHEETS.MEETING_SCHEDULE),
    getSheetValues(SHEET_ID, SHEETS.TASK_TRACKER),
    getSheetValues(SHEET_ID, SHEETS.ADMIN_NOTES),
  ])

  const events: TimelineEvent[] = []

  feedbackRows.slice(1)
    .map((r, i) => parseFeedback(r, i + 2))
    .filter((f) => f.clientId === clientId)
    .forEach((f) => {
      events.push({
        id: `fb-${f.rowNum}`,
        type: "feedback",
        date: f.date,
        title: `${f.interactionType || "Feedback"} — ${f.feedbackStatus}`,
        subtitle: f.seName ? `SE: ${f.seName}` : undefined,
        details: f.whatDiscussed,
        status: f.feedbackStatus,
        actor: f.kam,
      })
    })

  meetingRows.slice(1)
    .map((r, i) => parseMeeting(r, i + 2))
    .filter((m) => m.clientId === clientId)
    .forEach((m) => {
      events.push({
        id: `mt-${m.rowNum}`,
        type: "meeting",
        date: m.date,
        title: m.title,
        subtitle: m.meetingType,
        details: m.summary || m.notes,
        status: m.status,
        actor: m.kam,
      })
    })

  taskRows.slice(1)
    .map((r, i) => parseTask(r, i + 2))
    .filter((t) => t.clientId === clientId)
    .forEach((t) => {
      events.push({
        id: `tk-${t.rowNum}`,
        type: "task",
        date: t.dueDate,
        title: t.title,
        subtitle: `Priority: ${t.priority}`,
        details: t.description,
        status: t.status,
        actor: t.assignedTo,
      })
    })

  noteRows.slice(1)
    .map((r, i) => parseAdminNote(r, i + 2))
    .filter((n) => n.clientId === clientId)
    .forEach((n) => {
      events.push({
        id: `gd-${n.rowNum}`,
        type: "guidance",
        date: n.timestamp,
        title: "Admin Guidance",
        details: n.note,
        status: n.reaction || "Pending",
        actor: n.postedBy,
      })
    })

  events.sort((a, b) => b.date.localeCompare(a.date))

  return NextResponse.json(events.slice(0, 100))
}
