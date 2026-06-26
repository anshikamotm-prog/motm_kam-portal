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
  if (session.user.role === "SE" || session.user.role === "DR") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  const rows = await getSheetValues(SHEET_ID, SHEETS.MEETING_SCHEDULE)
  const idx = rows.slice(1).findIndex((r) => r[COLS.MEETING.ID] === id)
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const rowNum = idx + 2
  const meeting = parseMeeting(rows[idx + 1], rowNum)

  if (session.user.role !== "Admin" && meeting.kam !== session.user.kamName) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { summary, clientFeedback, discussionPoints, actions = [], momShared, nextReviewDate } = body

  type AR = { item: string; owner: string; dueDate: string }
  const validActions = (actions as AR[]).filter((a) => a.item?.trim())

  const actionItems = validActions.map((a) => a.item).join("\n")
  const actionOwner = validActions.map((a) => a.owner).filter(Boolean).join("\n")
  const actionDueDate = validActions[0]?.dueDate ?? ""

  const status = summary && validActions.length && momShared === "Yes" ? "Completed" : "Pending Documentation"

  const updates = [
    { range: `${SHEETS.MEETING_SCHEDULE}!L${rowNum}`, values: [[esc(summary ?? "")]] },
    { range: `${SHEETS.MEETING_SCHEDULE}!M${rowNum}`, values: [[esc(clientFeedback ?? "")]] },
    { range: `${SHEETS.MEETING_SCHEDULE}!N${rowNum}`, values: [[esc(discussionPoints ?? "")]] },
    { range: `${SHEETS.MEETING_SCHEDULE}!O${rowNum}`, values: [[esc(actionItems)]] },
    { range: `${SHEETS.MEETING_SCHEDULE}!P${rowNum}`, values: [[esc(actionOwner)]] },
    { range: `${SHEETS.MEETING_SCHEDULE}!Q${rowNum}`, values: [[esc(actionDueDate)]] },
    { range: `${SHEETS.MEETING_SCHEDULE}!R${rowNum}`, values: [[esc(momShared ?? "Pending")]] },
    { range: `${SHEETS.MEETING_SCHEDULE}!S${rowNum}`, values: [[esc(nextReviewDate ?? "")]] },
    { range: `${SHEETS.MEETING_SCHEDULE}!K${rowNum}`, values: [[status]] },
  ]
  await batchUpdate(SHEET_ID, updates)

  // Create one task per action item
  for (const action of validActions) {
    const taskId = `TSK-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
    await appendRow(SHEET_ID, SHEETS.TASK_TRACKER, [
      taskId, meeting.clientId, meeting.company, meeting.kam,
      esc(action.owner || meeting.kam),
      esc(`Action from meeting: ${meeting.title}`),
      esc(action.item), "", "Medium", "Open",
      esc(action.dueDate ?? ""), "", "No", "Meeting", "",
    ])
  }

  return NextResponse.json({ success: true, status })
}
