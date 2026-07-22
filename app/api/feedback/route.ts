import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSheetValues, appendRow, batchUpdate, colToLetter } from "@/lib/sheets"
import { parseFeedback } from "@/lib/sheets-helpers"
import { SHEET_ID, SHEETS, COLS, RESOLUTION_STATUS_OPTIONS } from "@/constants"
import { esc, nowIST, parseFlexDate } from "@/lib/utils"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role === "SE" || session.user.role === "DR") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const rows = await getSheetValues(SHEET_ID, SHEETS.FEEDBACK_LOG)
    const data = rows.slice(1).map((row, i) => parseFeedback(row, i + 2))

    const filterClientId = req.nextUrl.searchParams.get("clientId")

    // When fetching by clientId (popup), skip the 30-day cutoff so all history is available
    const cutoff = filterClientId ? null : (() => {
      const d = new Date(); d.setDate(d.getDate() - 30); return d
    })()

    const filtered = data
      .filter((f) => {
        if (session.user.role !== "Admin" && f.kam !== session.user.kamName) return false
        if (filterClientId && f.clientId !== filterClientId) return false
        if (cutoff) {
          const d = parseFlexDate(f.date)
          return d !== null && d >= cutoff
        }
        return true
      })
      .sort((a, b) => {
        const da = parseFlexDate(a.date)?.getTime() ?? 0
        const db = parseFlexDate(b.date)?.getTime() ?? 0
        return db - da
      })

    return NextResponse.json(filtered)
  } catch (err) {
    console.error("[feedback GET]", err)
    return NextResponse.json({ error: "Failed to load feedback" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role === "SE" || session.user.role === "DR") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { rowNum, resolutionStatus } = await req.json()
  if (!rowNum || !resolutionStatus) return NextResponse.json({ error: "rowNum and resolutionStatus required" }, { status: 400 })
  if (!(RESOLUTION_STATUS_OPTIONS as readonly string[]).includes(resolutionStatus)) {
    return NextResponse.json({ error: "Invalid resolutionStatus" }, { status: 400 })
  }

  try {
    const rows = await getSheetValues(SHEET_ID, SHEETS.FEEDBACK_LOG)
    const row = rows[rowNum - 1]
    if (!row) return NextResponse.json({ error: "Row not found" }, { status: 404 })
    if (session.user.role !== "Admin" && row[COLS.FEEDBACK.KAM] !== session.user.kamName) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await batchUpdate(SHEET_ID, [{
      range: `${SHEETS.FEEDBACK_LOG}!${colToLetter(COLS.FEEDBACK.RESOLUTION_STATUS + 1)}${rowNum}`,
      values: [[esc(resolutionStatus)]],
    }])

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[feedback PATCH]", err)
    return NextResponse.json({ error: "Failed to update feedback" }, { status: 500 })
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
        // M-3: use colToLetter so column refs stay correct if Client Master schema changes
        const c = COLS.CLIENT
        const updates: Array<{ range: string; values: unknown[][] }> = [
          { range: `${SHEETS.CLIENT_MASTER}!${colToLetter(c.LAST_FEEDBACK_DATE + 1)}${rowNum}`, values: [[esc(date)]] },
        ]
        if (feedbackStatus) updates.push({ range: `${SHEETS.CLIENT_MASTER}!${colToLetter(c.FEEDBACK_STATUS + 1)}${rowNum}`, values: [[esc(feedbackStatus)]] })
        if (healthUpdate) updates.push({ range: `${SHEETS.CLIENT_MASTER}!${colToLetter(c.HEALTH + 1)}${rowNum}`, values: [[esc(healthUpdate)]] })
        if (nextFollowupDate) updates.push({ range: `${SHEETS.CLIENT_MASTER}!${colToLetter(c.NEXT_FOLLOWUP + 1)}${rowNum}`, values: [[esc(nextFollowupDate)]] })
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
