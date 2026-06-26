import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSheetValues, batchUpdate } from "@/lib/sheets"
import { SHEET_ID, SHEETS, COLS } from "@/constants"
import { esc, nowIST } from "@/lib/utils"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const rows = await getSheetValues(SHEET_ID, SHEETS.TASK_TRACKER)
  const idx = rows.slice(1).findIndex((r) => r[COLS.TASK.ID] === id)
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const rowNum = idx + 2
  const taskRow = rows[idx + 1]

  // SE can only update tasks assigned to them; KAM can only update tasks in their portfolio
  if (session.user.role === "SE" || session.user.role === "DR") {
    if (taskRow[COLS.TASK.ASSIGNED_TO] !== session.user.fullName) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  } else if (session.user.role !== "Admin") {
    if (taskRow[COLS.TASK.KAM] !== session.user.kamName) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }
  const updates: Array<{ range: string; values: unknown[][] }> = []

  if (body.status) {
    updates.push({ range: `${SHEETS.TASK_TRACKER}!J${rowNum}`, values: [[esc(body.status)]] })
    if (body.status === "Done" || body.status === "Completed") {
      updates.push({ range: `${SHEETS.TASK_TRACKER}!L${rowNum}`, values: [[new Date().toISOString().split("T")[0]]] })
    }
  }
  if (body.notes !== undefined) {
    updates.push({ range: `${SHEETS.TASK_TRACKER}!O${rowNum}`, values: [[esc(body.notes)]] })
  }

  if (updates.length > 0) await batchUpdate(SHEET_ID, updates)
  return NextResponse.json({ success: true })
}
