"use client"
import { Bell } from "lucide-react"
import { useEffect, useState } from "react"
import Link from "next/link"

export function NotificationBell() {
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    let es: EventSource | null = null

    const connectSSE = () => {
      es = new EventSource("/api/notifications/stream")
      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          if (typeof data.unread === "number") setUnread(data.unread)
        } catch {}
      }
      es.onerror = () => {
        es?.close()
        setTimeout(connectSSE, 60_000)
      }
    }

    connectSSE()
    return () => es?.close()
  }, [])

  return (
    <Link href="/dashboard/notifications" className="relative flex items-center p-2 rounded-lg hover:bg-slate-800 transition-colors">
      <Bell className="h-5 w-5 text-slate-300" />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  )
}
