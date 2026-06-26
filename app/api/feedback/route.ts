import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSheetValues, appendRow, batchUpdate } from "@/lib/sheets"
import { parseFeedback } from "@/lib/sheets-helpers"
import { SHEET_ID, SHEETS, COLS } from "@/constants"
import { esc, nowIST } from "@/lib/utils"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role === "SE" || session.user.role === "DR") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const rows = await getSheetValues(SHEET_ID, SHEETS.FEEDBACK_LOG)
    const data = rows.slice(1).map((row, i) => parseFeedback(row, i + 2))

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)

    const filtered = data
      .filter((f) => {
        if (session.user.role !== "Admin" && f.kam !== session.user.kamName) return false
        const d = new Date(f.date)
        return !isNaN(d.getTime()) && d >= cutoff
      })
      .sort((a, b) => b.date.localeCompare(a.date))

    return NextResponse.json(filtered)
  } catch (err) {
    console.error("[feedback GET]", err)
    return NextResponse.json({ error: "Failed to load feedback" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role === "SE" || session.user.role === "DR") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const {
    date, clientId, company, seName, interactionType, feedbackStatus,
    healthUpdate, whatDiscussed, clientConcern, actionRequired, actionOwner,
    actionDueDate, resolutionStatus, currentStatus, nextFollowupDate,
  } = body

  if (!whatDiscussed) {
    return NextResponse.json({ error: "whatDiscussed is required" }, { status: 400 })
  }
  if (!clientId || !date) {
    return NextResponse.json({ error: "clientId and date are required" }, { status: 400 })
  }

  try {
    const kam = session.user.role === "Admin" ? (body.kam ?? session.user.kamName) : session.user.kamName
    const loggedAt = nowIST()

    await appendRow(SHEET_ID, SHEETS.FEEDBACK_LOG, [
      esc(date), esc(clientId), esc(company ?? ""), esc(kam), esc(seName ?? ""),
      esc(interactionType ?? ""), esc(feedbackStatus ?? ""), esc(healthUpdate ?? ""),
      esc(whatDiscussed), esc(clientConcern ?? ""), esc(actionRequired ?? ""),
      esc(actionOwner ?? ""), esc(actionDueDate ?? ""), esc(resolutionStatus ?? ""),
      esc(currentStatus ?? ""), esc(nextFollowupDate ?? ""), "", loggedAt,
    ])

    // Update Client Master — runs after feedback is saved; failures here are non-fatal
    try {
      const clientRows = await getSheetValues(SHEET_ID, SHEETS.CLIENT_MASTER)
      const cidx = clientRows.slice(1).findIndex((r) => r[COLS.CLIENT.ID] === clientId)
      if (cidx !== -1) {
        const rowNum = cidx + 2
        const updates: Array<{ range: string; values: unknown[][] }> = [
          { range: `${SHEETS.CLIENT_MASTER}!O${rowNum}`, values: [[esc(date)]] },
        ]
        if (feedbackStatus) updates.push({ range: `${SHEETS.CLIENT_MASTER}!M${rowNum}`, values: [[esc(feedbackStatus)]] })
        if (healthUpdate) updates.push({ range: `${SHEETS.CLIENT_MASTER}!L${rowNum}`, values: [[esc(healthUpdate)]] })
        if (nextFollowupDate) updates.push({ range: `${SHEETS.CLIENT_MASTER}!Q${rowNum}`, values: [[esc(nextFollowupDate)]] })
        await batchUpdate(SHEET_ID, updates)
      }
    } catch (clientErr) {
      console.error("[feedback POST] client master update failed", clientErr)
      // Feedback is already saved — don't fail the request
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[feedback POST]", err)
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 })
  }
}
