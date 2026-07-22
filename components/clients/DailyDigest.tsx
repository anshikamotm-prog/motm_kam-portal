"use client"
import { useMemo } from "react"
import { useSession } from "next-auth/react"
import { useClients } from "@/hooks/useClients"
import { useMeetings } from "@/hooks/useMeetings"
import { useTasks } from "@/hooks/useTasks"
import { daysSince } from "@/lib/utils"
import { AlertTriangle, Calendar, CheckSquare } from "lucide-react"

export function DailyDigest() {
  const { data: session } = useSession()
  const { data: clients = [] } = useClients()
  const { data: meetings = [] } = useMeetings()
  const { data: tasks = [] } = useTasks()
  const today = new Date().toISOString().split("T")[0]

  const overdueCount = useMemo(
    () => clients.filter((c) => { const d = daysSince(c.lastFeedbackDate); return d !== null && d > 7 }).length,
    [clients],
  )
  const meetingCount = useMemo(
    () => meetings.filter((m) => m.date === today && m.status !== "Cancelled" && m.status !== "Missed").length,
    [meetings, today],
  )
  const taskCount = useMemo(
    () => tasks.filter((t) => t.dueDate && t.dueDate <= today && t.status !== "Done" && t.status !== "Completed").length,
    [tasks, today],
  )

  // Digest is KAM/SE specific — not useful for Admin's all-data view
  if (session?.user?.role === "Admin") return null
  if (!overdueCount && !meetingCount && !taskCount) return null

  return (
    <div className="mb-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs flex flex-wrap items-center gap-x-5 gap-y-1">
      <span className="font-semibold text-amber-800 shrink-0">Today</span>
      {overdueCount > 0 && (
        <span className="flex items-center gap-1.5 text-orange-700">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <strong>{overdueCount}</strong>&nbsp;overdue follow-up{overdueCount !== 1 ? "s" : ""}
        </span>
      )}
      {meetingCount > 0 && (
        <span className="flex items-center gap-1.5 text-blue-700">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <strong>{meetingCount}</strong>&nbsp;meeting{meetingCount !== 1 ? "s" : ""} today
        </span>
      )}
      {taskCount > 0 && (
        <span className="flex items-center gap-1.5 text-red-700">
          <CheckSquare className="h-3.5 w-3.5 shrink-0" />
          <strong>{taskCount}</strong>&nbsp;task{taskCount !== 1 ? "s" : ""} due
        </span>
      )}
    </div>
  )
}
