"use client"
import type { Client } from "@/types/client"
import { HealthDot } from "@/components/shared/HealthDot"
import { Input } from "@/components/ui/input"
import { cn, daysSince } from "@/lib/utils"
import { Search, AlertTriangle } from "lucide-react"

const HEALTH_FILTERS = ["All", "Green", "Orange", "Red"]

interface Props {
  clients: Client[]
  selected: Client | null
  onSelect: (c: Client) => void
  search: string
  onSearch: (s: string) => void
  healthFilter: string
  onHealthFilter: (h: string) => void
}

export function ClientList({ clients, selected, onSelect, search, onSearch, healthFilter, onHealthFilter }: Props) {
  return (
    <div className="w-64 flex-shrink-0 flex flex-col border-r border-slate-200 bg-white">
      {/* Search */}
      <div className="p-3 border-b border-slate-100">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* Health filters */}
      <div className="px-3 py-2 flex gap-1 flex-wrap border-b border-slate-100">
        {HEALTH_FILTERS.map((h) => (
          <button
            key={h}
            onClick={() => onHealthFilter(h)}
            className={cn(
              "px-2 py-0.5 rounded-full text-xs font-medium transition-colors",
              healthFilter === h
                ? "bg-[#1e3a5f] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200",
            )}
          >
            {h}
          </button>
        ))}
      </div>

      {/* Client count */}
      <div className="px-3 py-1.5 text-xs text-slate-400 border-b border-slate-100">
        {clients.length} client{clients.length !== 1 ? "s" : ""}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {clients.length === 0 && (
          <div className="p-4 text-xs text-slate-400 text-center">No clients found</div>
        )}
        {clients.map((c) => {
          const days = daysSince(c.lastFeedbackDate)
          const isOverdue = days !== null && days > 7
          const isSelected = selected?.clientId === c.clientId
          return (
            <button
              key={c.clientId}
              onClick={() => onSelect(c)}
              className={cn(
                "w-full text-left px-3 py-2.5 border-b border-slate-50 hover:bg-slate-50 transition-colors",
                isSelected && "bg-blue-50 border-l-2 border-l-[#1e3a5f]",
              )}
            >
              <div className="flex items-center gap-2">
                <HealthDot health={c.health} />
                <span className="text-sm font-medium text-slate-800 truncate flex-1">{c.company}</span>
                {isOverdue && <AlertTriangle className="h-3 w-3 text-orange-400 flex-shrink-0" aria-label="Feedback overdue" />}
              </div>
              <div className="mt-0.5 pl-4 flex items-center gap-2">
                <span className="text-[10px] text-slate-400">{c.clientId}</span>
                {c.feedbackStatus && (
                  <span className={cn(
                    "text-[10px] px-1.5 rounded-full",
                    c.feedbackStatus === "Positive" && "bg-[#bbf7d0] text-[#14532d]",
                    c.feedbackStatus === "On Notice" && "bg-[#fef9c3] text-[#713f12]",
                    (c.feedbackStatus === "Intent to Leave" || c.feedbackStatus === "At Risk") && "bg-[#fca5a5] text-[#7f1d1d]",
                    c.feedbackStatus === "Planning to Leave" && "bg-[#fed7aa] text-[#7c2d12]",
                    (c.feedbackStatus === "Neutral" || !["Positive","On Notice","Intent to Leave","Planning to Leave","At Risk"].includes(c.feedbackStatus)) && "bg-slate-100 text-slate-500",
                  )}>
                    {c.feedbackStatus}
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
