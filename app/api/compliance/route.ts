import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSheetValues } from "@/lib/sheets"
import { parseClient, parseMeeting, parseTask, parseFeedback } from "@/lib/sheets-helpers"
import { SHEET_ID, SHEETS } from "@/constants"
import { computeCompliance } from "@/lib/compliance"
import { getKAMNames } from "@/lib/getKAMNames"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role === "SE" || session.user.role === "DR") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const [clientRows, meetingRows, taskRows, feedbackRows, allKamNames] = await Promise.all([
    getSheetValues(SHEET_ID, SHEETS.CLIENT_MASTER),
    getSheetValues(SHEET_ID, SHEETS.MEETING_SCHEDULE),
    getSheetValues(SHEET_ID, SHEETS.TASK_TRACKER),
    getSheetValues(SHEET_ID, SHEETS.FEEDBACK_LOG),
    getKAMNames(),
  ])

  const INACTIVE = ["Closed", "On Hold", "Uncountable"]
  const clients = clientRows.slice(1).map((r, i) => parseClient(r, i + 2))
    .filter((c) => !INACTIVE.includes(c.status))
  const meetings = meetingRows.slice(1).map((r, i) => parseMeeting(r, i + 2))
  const tasks = taskRows.slice(1).map((r, i) => parseTask(r, i + 2))
  const feedback = feedbackRows.slice(1).map((r, i) => parseFeedback(r, i + 2))

  const kams = session.user.role === "Admin" ? allKamNames : [session.user.kamName]
  const scores = kams.map((k) => computeCompliance(k, clients, feedback, meetings, tasks))

  return NextResponse.json(scores)
}
