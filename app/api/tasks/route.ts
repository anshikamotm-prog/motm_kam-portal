import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSheetValues, appendRow } from "@/lib/sheets"
import { parseTask } from "@/lib/sheets-helpers"
import { SHEET_ID, SHEETS, COLS, PRIORITY_OPTIONS } from "@/constants"
import { esc, nowIST, parseFlexDate } from "@/lib/utils"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = req.nextUrl
  const showCompleted = searchParams.get("completed") === "true"
  const showAll = searchParams.get("all") === "true"
  const filterKam = searchParams.get("kam")
  const filterClientId = searchParams.get("clientId")
  const filterStatus = searchParams.get("status")
  const filterPriority = searchParams.get("priority")

  const rows = await getSheetValues(SHEET_ID, SHEETS.TASK_TRACKER)
  let data = rows.slice(1).map((row, i) => parseTask(row, i + 2))

  // Role filter
  if (session.user.role === "SE" || session.user.role === "DR") {
    data = data.filter((t) => t.assignedTo === session.user.fullName)
  } else if (session.user.role !== "Admin") {
    data = data.filter((t) => t.kam === session.user.kamName)
  } else if (filterKam) {
    data = data.filter((t) => t.kam === filterKam)
  }

  if (filterClientId) data = data.filter((t) => t.clientId === filterClientId)

  const completedStatuses = ["Done", "Completed", "Cancelled"]
  if (!showAll && !showCompleted) {
    data = data.filter((t) => !completedStatuses.includes(t.status))
  } else if (!showAll && showCompleted) {
    data = data.filter((t) => completedStatuses.includes(t.status))
  }

  if (filterStatus) data = data.filter((t) => t.status === filterStatus)
  if (filterPriority) data = data.filter((t) => t.priority === filterPriority)

  // Sort: overdue first, then by priority
  const priorityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 }
  data.sort((a, b) => {
    if (a.overdue === "YES" && b.overdue !== "YES") return -1
    if (b.overdue === "YES" && a.overdue !== "YES") return 1
    const pa = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4
    const pb = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4
    return pa - pb
  })

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { clientId, company, title, description, priority, dueDate, assignedTo, department, source, notes } = body

  if (!title || !priority || !dueDate) {
    return NextResponse.json({ error: "title, priority, dueDate are required" }, { status: 400 })
  }
  // L-2: validate priority against allowed values
  if (!(PRIORITY_OPTIONS as readonly string[]).includes(priority)) {
    return NextResponse.json({ error: `priority must be one of: ${PRIORITY_OPTIONS.join(", ")}` }, { status: 400 })
  }

  const kam = session.user.role === "Admin" ? (body.kam ?? session.user.kamName) : session.user.kamName
  const taskId = `TSK-${Date.now()}`
  // M-4: use parseFlexDate so DD/MM/YYYY due dates compare correctly
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const dueDateParsed = parseFlexDate(dueDate)
  const overdue = dueDateParsed !== null && dueDateParsed < now ? "YES" : "No"

  await appendRow(SHEET_ID, SHEETS.TASK_TRACKER, [
    taskId, esc(clientId ?? ""), esc(company ?? ""), esc(kam),
    esc(assignedTo ?? kam), esc(title), esc(description ?? ""),
    esc(department ?? ""), esc(priority), "Open",
    esc(dueDate), "", overdue, esc(source ?? "Manual"), esc(notes ?? ""),
  ])

  return NextResponse.json({ success: true, taskId })
}
