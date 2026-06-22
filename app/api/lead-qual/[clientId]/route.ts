import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSheetValues, appendRow } from "@/lib/sheets"
import { parseLeadQual } from "@/lib/sheets-helpers"
import { SHEET_ID, SHEETS, COLS } from "@/constants"
import { esc, nowIST, calcBANTScore, bantLabel } from "@/lib/utils"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { clientId } = await params
  const rows = await getSheetValues(SHEET_ID, SHEETS.LEAD_QUALIFICATION)
  const data = rows
    .slice(1)
    .map((r, i) => parseLeadQual(r, i + 2))
    .filter((l) => l.clientId === clientId)
    .reverse()
    .slice(0, 20)

  return NextResponse.json(data)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { clientId } = await params
  const body = await req.json()

  const { company, leadSource, leadDetails, budget, decisionMaker, needIdentified, timeline, competition, notes } = body

  const score = calcBANTScore(budget, decisionMaker, needIdentified, timeline)
  const qualStatus = bantLabel(score)

  await appendRow(SHEET_ID, SHEETS.LEAD_QUALIFICATION, [
    nowIST(), esc(clientId), esc(company ?? ""),
    esc(session.user.kamName ?? ""), esc(leadSource ?? ""),
    esc(leadDetails ?? ""), esc(budget ?? ""), esc(decisionMaker ?? ""),
    esc(needIdentified ?? ""), esc(timeline ?? ""), esc(competition ?? ""),
    score, qualStatus, esc(notes ?? ""), esc(session.user.name ?? ""),
  ])

  return NextResponse.json({ success: true, score, qualStatus })
}
