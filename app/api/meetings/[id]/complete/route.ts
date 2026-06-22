import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSheetValues, batchUpdate, appendRow } from "@/lib/sheets"
import { parseMeeting } from "@/lib/sheets-helpers"
import { SHEET_ID, SHEETS, COLS } from "@/constants"
import { esc, nowIST } from "@/lib/utils"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const rows = await getSheetValues(SHEET_ID, SHEETS.MEETING_SCHEDULE)
  const idx = rows.slice(1).findIndex((r) => r[COLS.MEETING.ID] === id)
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const rowNum = idx + 2
  const meeting = parseMeeting(rows[idx + 1], rowNum)

  const {
    summary, clientFeedback, discussionPoints, actionItems,
    actionOwner, actionDueDate, momShared, nextReviewDate,
  } = body

  const status =
    summary && actionItems && momShared === "Yes" ? "Completed" : "Pending Documentation"

  const m = COLS.MEETING
  const updates = [
    { range: `${SHEETS.MEETING_SCHEDULE}!L${rowNum}`, values: [[esc(summary ?? "")]] },
    { range: `${SHEETS.MEETING_SCHEDULE}!M${rowNum}`, values: [[esc(clientFeedback ?? "")]] },
    { range: `${SHEETS.MEETING_SCHEDULE}!N${rowNum}`, values: [[esc(discussionPoints ?? "")]] },
    { range: `${SHEETS.MEETING_SCHEDULE}!O${rowNum}`, values: [[esc(actionItems ?? "")]] },
    { range: `${SHEETS.MEETING_SCHEDULE}!P${rowNum}`, values: [[esc(actionOwner ?? "")]] },
    { range: `${SHEETS.MEETING_SCHEDULE}!Q${rowNum}`, values: [[esc(actionDueDate ?? "")]] },
    { range: `${SHEETS.MEETING_SCHEDULE}!R${rowNum}`, values: [[esc(momShared ?? "Pending")]] },
    { range: `${SHEETS.MEETING_SCHEDULE}!S${rowNum}`, values: [[esc(nextReviewDate ?? "")]] },
    { range: `${SHEETS.MEETING_SCHEDULE}!K${rowNum}`, values: [[status]] },
  ]
  await batchUpdate(SHEET_ID, updates)

  // Auto-create task from action items
  if (actionItems) {
    const taskId = `TSK-${Date.now()}`
    await appendRow(SHEET_ID, SHEETS.TASK_TRACKER, [
      taskId, meeting.clientId, meeting.company, meeting.kam,
      actionOwner ?? meeting.kam,
      `Action from meeting: ${meeting.title}`,
      esc(actionItems), "", "Medium", "Open",
      actionDueDate ?? "", "", "No", "Meeting", "",
    ])
  }

  return NextResponse.json({ success: true, status })
}
