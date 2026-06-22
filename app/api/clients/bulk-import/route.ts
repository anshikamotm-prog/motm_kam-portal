import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSheetValues, appendRows } from "@/lib/sheets"
import { SHEET_ID, SHEETS, COLS, STATUS_OPTIONS } from "@/constants"
import { getKAMNames } from "@/lib/getKAMNames"
import { esc, nowIST } from "@/lib/utils"

interface ImportRow {
  clientId: string
  company: string
  industry?: string
  city?: string
  startDate?: string
  status?: string
  kam: string
  se?: string
  contact?: string
  phone?: string
  contractValue?: string
  monthlyValue?: string
  services?: string
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "Admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const incoming: ImportRow[] = body.rows ?? []
  if (!incoming.length) return NextResponse.json({ error: "No rows provided" }, { status: 400 })

  // Load existing IDs to detect duplicates + fetch current KAM names
  const [existingRows, kamNames] = await Promise.all([
    getSheetValues(SHEET_ID, SHEETS.CLIENT_MASTER),
    getKAMNames(),
  ])
  const existingIds = new Set(existingRows.slice(1).map((r) => r[COLS.CLIENT.ID]?.trim().toLowerCase()).filter(Boolean))

  const kamSet = new Set<string>(kamNames)
  const statusSet = new Set<string>(STATUS_OPTIONS)
  const errors: { row: number; clientId: string; error: string }[] = []
  const valid: unknown[][] = []
  const importedAt = nowIST()

  incoming.forEach((row, i) => {
    const rowNum = i + 1
    const id = row.clientId?.trim()
    const company = row.company?.trim()
    const kam = row.kam?.trim()
    const status = row.status?.trim() || "New"

    if (!id) { errors.push({ row: rowNum, clientId: "", error: "Client ID is required" }); return }
    if (!company) { errors.push({ row: rowNum, clientId: id, error: "Company is required" }); return }
    if (!kam || !kamSet.has(kam)) { errors.push({ row: rowNum, clientId: id, error: `KAM must be one of: ${[...kamSet].join(", ")}` }); return }
    if (!statusSet.has(status)) { errors.push({ row: rowNum, clientId: id, error: `Invalid status "${status}"` }); return }
    if (existingIds.has(id.toLowerCase())) { errors.push({ row: rowNum, clientId: id, error: `Client ID already exists` }); return }

    // Mark as seen in this batch to catch intra-batch duplicates
    existingIds.add(id.toLowerCase())

    const today = new Date().toISOString().split("T")[0]
    valid.push([
      esc(id),                                           // A Client ID
      esc(company),                                      // B Company
      esc(row.industry ?? ""),                           // C Industry
      esc(row.city ?? ""),                               // D City
      esc(row.startDate?.trim() || today),               // E Start Date
      "",                                                // F Duration Days (auto-calc)
      esc(status),                                       // G Status
      esc(kam),                                          // H KAM
      esc(row.se ?? ""),                                 // I SE
      esc(row.contact ?? ""),                            // J Contact Person
      esc(row.phone ?? ""),                              // K Phone
      "Unset",                                           // L Health
      "Neutral",                                         // M Feedback Status
      "",                                                // N AI Priority
      "",                                                // O Last Feedback Date
      "",                                                // P Days Since Feedback
      "",                                                // Q Next Followup
      "",                                                // R Overdue
      esc(row.contractValue ?? ""),                      // S Contract Value
      esc(row.monthlyValue ?? ""),                       // T Monthly Value
      esc(row.services ?? ""),                           // U Services
      "",                                                // V KAM Notes
      `Bulk imported ${importedAt}`,                     // W Assign Log
      "",                                                // X Sheet ID
      "",                                                // Y Dashboard ID
    ])
  })

  if (valid.length > 0) {
    await appendRows(SHEET_ID, SHEETS.CLIENT_MASTER, valid)
  }

  return NextResponse.json({ imported: valid.length, errors })
}
