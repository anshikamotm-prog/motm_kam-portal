import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSheetValues } from "@/lib/sheets"
import { parseClient, parseMeeting, parseTask, parseFeedback } from "@/lib/sheets-helpers"
import { SHEET_ID, SHEETS, KAM_NAMES } from "@/constants"
import { computeCompliance } from "@/lib/compliance"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [clientRows, meetingRows, taskRows, feedbackRows] = await Promise.all([
    getSheetValues(SHEET_ID, SHEETS.CLIENT_MASTER),
    getSheetValues(SHEET_ID, SHEETS.MEETING_SCHEDULE),
    getSheetValues(SHEET_ID, SHEETS.TASK_TRACKER),
    getSheetValues(SHEET_ID, SHEETS.FEEDBACK_LOG),
  ])

  const clients = clientRows.slice(1).map((r, i) => parseClient(r, i + 2))
  const meetings = meetingRows.slice(1).map((r, i) => parseMeeting(r, i + 2))
  const tasks = taskRows.slice(1).map((r, i) => parseTask(r, i + 2))
  const feedback = feedbackRows.slice(1).map((r, i) => parseFeedback(r, i + 2))

  const kams = session.user.role === "Admin" ? [...KAM_NAMES] : [session.user.kamName]
  const scores = kams.map((k) => computeCompliance(k, clients, feedback, meetings, tasks))

  return NextResponse.json(scores)
}
