"use client"
import { useState } from "react"
import { useNotifications, useAckNotification } from "@/hooks/useNotifications"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageSpinner } from "@/components/shared/Spinner"
import { formatDate } from "@/lib/utils"
import { Bell, CheckCheck, AlertTriangle, Info } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"

const SEVERITY_ICON = {
  High: <AlertTriangle className="h-4 w-4 text-red-500" />,
  Medium: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  Low: <Info className="h-4 w-4 text-blue-400" />,
}

export default function NotificationsView() {
  const { data: notifications, isLoading } = useNotifications()
  const ack = useAckNotification()
  const qc = useQueryClient()
  const [ackingAll, setAckingAll] = useState(false)
  const [filter, setFilter] = useState<"all" | "unread">("unread")

  const unread = notifications?.filter((n) => n.acknowledged !== "Yes") ?? []
  const displayed = filter === "unread" ? unread : (notifications ?? [])

  const ackAll = async () => {
    setAckingAll(true)
    await fetch("/api/notifications/ack-all", { method: "POST" })
    qc.invalidateQueries({ queryKey: ["notifications"] })
    setAckingAll(false)
  }

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Notifications</h1>
          {unread.length > 0 && (
            <p className="text-sm text-slate-500 mt-0.5">{unread.length} unread</p>
          )}
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <button
              onClick={() => setFilter("unread")}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${filter === "unread" ? "bg-[#1e3a5f] text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
            >
              Unread
            </button>
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${filter === "all" ? "bg-[#1e3a5f] text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
            >
              All
            </button>
          </div>
          {unread.length > 0 && (
            <Button size="sm" variant="outline" onClick={ackAll} disabled={ackingAll}>
              <CheckCheck className="h-4 w-4 mr-1" />
              {ackingAll ? "Clearing..." : "Mark all read"}
            </Button>
          )}
        </div>
      </div>

      {displayed.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center gap-3 text-slate-400">
          <Bell className="h-10 w-10" />
          <p className="text-sm">{filter === "unread" ? "No unread notifications" : "No notifications yet"}</p>
        </div>
      )}

      <div className="space-y-2">
        {displayed.map((n) => {
          const isRead = n.acknowledged === "Yes"
          return (
            <div
              key={n.rowNum}
              className={`bg-white rounded-xl border p-4 flex gap-3 ${isRead ? "border-slate-200 opacity-70" : "border-[#1e3a5f]/20 shadow-sm"}`}
            >
              <div className="pt-0.5 flex-shrink-0">
                {SEVERITY_ICON[n.severity as keyof typeof SEVERITY_ICON] ?? <Info className="h-4 w-4 text-slate-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={`text-sm ${isRead ? "text-slate-600" : "text-slate-800 font-medium"}`}>{n.message}</p>
                    {n.company && <p className="text-xs text-slate-400 mt-0.5">{n.company}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={n.severity === "High" ? "red" : n.severity === "Medium" ? "orange" : "blue"} className="text-[10px]">
                      {n.severity}
                    </Badge>
                    <span className="text-xs text-slate-400">{formatDate(n.timestamp?.split("T")[0] ?? "")}</span>
                  </div>
                </div>
                {!isRead && (
                  <button
                    onClick={() => ack.mutate(n.rowNum)}
                    className="mt-2 text-xs text-[#1e3a5f] hover:underline"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
