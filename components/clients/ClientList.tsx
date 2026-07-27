"use client"
import { useState } from "react"
import type { Client } from "@/types/client"
import { HealthDot } from "@/components/shared/HealthDot"
import { Input } from "@/components/ui/input"
import { cn, daysSince } from "@/lib/utils"
import { Search, AlertTriangle, Star, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronRight, Archive } from "lucide-react"

const HEALTH_FILTERS = ["All", "Green", "Orange", "Red"]

interface Props {
  clients: Client[]
  selected: Client | null
  onSelect: (c: Client) => void
  search: string
  onSearch: (s: string) => void
  healthFilter: string
  onHealthFilter: (h: string) => void
  pinnedIds: string[]
  onTogglePin: (id: string) => void
  trends: Map<string, "up" | "down" | "same">
  archivedClients?: Client[]
  className?: string
}

function TrendIcon({ trend }: { trend: "up" | "down" | "same" | undefined }) {
  if (trend === "up") return <TrendingUp className="h-3 w-3 text-green-500 shrink-0" aria-label="Health improving" />
  if (trend === "down") return <TrendingDown className="h-3 w-3 text-red-400 shrink-0" aria-label="Health declining" />
  if (trend === "same") return <Minus className="h-3 w-3 text-slate-300 shrink-0" aria-label="Health stable" />
  return null
}

function ClientCard({
  c, isSelected, onSelect, pinned, onTogglePin, trend,
}: {
  c: Client
  isSelected: boolean
  onSelect: () => void
  pinned: boolean
  onTogglePin: () => void
  trend: "up" | "down" | "same" | undefined
}) {
  const days = daysSince(c.lastFeedbackDate)
  const isOverdue = days !== null && days > 7
  // Outer element must not be <button> because the pin icon is also a <button>
  // (nested interactive elements are invalid HTML and break on some browsers/screen readers)
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect()}
      className={cn(
        "w-full text-left px-3 py-2.5 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer",
        isSelected && "bg-blue-50 border-l-2 border-l-[#1e3a5f]",
      )}
    >
      <div className="flex items-center gap-2">
        <HealthDot health={c.health} />
        <span className="text-sm font-medium text-slate-800 truncate flex-1">{c.company}</span>
        <TrendIcon trend={trend} />
        {isOverdue && <AlertTriangle className="h-3 w-3 text-orange-400 shrink-0" aria-label="Feedback overdue" />}
        <button
          onClick={(e) => { e.stopPropagation(); onTogglePin() }}
          className={cn(
            "shrink-0 p-0.5 rounded transition-colors",
            pinned ? "text-amber-400 hover:text-amber-500" : "text-slate-200 hover:text-slate-400",
          )}
          aria-label={pinned ? "Unpin client" : "Pin client"}
        >
          <Star className="h-3 w-3" fill={pinned ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="mt-0.5 pl-4 flex items-center gap-2">
        <span className="text-[10px] text-slate-400">{c.clientId}</span>
        {c.feedbackStatus && (
          <span className={cn(
            "text-[10px] px-1.5 rounded-full",
            c.feedbackStatus === "Positive" && "bg-[#bbf7d0] text-[#14532d]",
            c.feedbackStatus === "Negative" && "bg-[#fed7aa] text-[#7c2d12]",
            c.feedbackStatus === "On Notice" && "bg-[#fef9c3] text-[#713f12]",
            (c.feedbackStatus === "Intent to Leave" || c.feedbackStatus === "At Risk") && "bg-[#fca5a5] text-[#7f1d1d]",
            c.feedbackStatus === "Planning to Leave" && "bg-[#fed7aa] text-[#7c2d12]",
            !["Positive", "Negative", "On Notice", "Intent to Leave", "Planning to Leave", "At Risk"].includes(c.feedbackStatus) && "bg-slate-100 text-slate-500",
          )}>
            {c.feedbackStatus}
          </span>
        )}
      </div>
    </div>
  )
}

export function ClientList({
  clients, selected, onSelect, search, onSearch, healthFilter, onHealthFilter,
  pinnedIds, onTogglePin, trends, archivedClients = [], className,
}: Props) {
  const [showArchived, setShowArchived] = useState(false)
  const pinnedClients = clients.filter((c) => pinnedIds.includes(c.clientId))
  const unpinnedClients = clients.filter((c) => !pinnedIds.includes(c.clientId))

  return (
    <div className={cn("w-full md:w-64 flex-shrink-0 flex flex-col border-r border-slate-200 bg-white", className)}>
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

        {/* Pinned section */}
        {pinnedClients.length > 0 && (
          <>
            <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wide bg-amber-50 border-b border-slate-100 flex items-center gap-1">
              <Star className="h-2.5 w-2.5 text-amber-400" fill="currentColor" /> Pinned
            </div>
            {pinnedClients.map((c) => (
              <ClientCard
                key={c.clientId}
                c={c}
                isSelected={selected?.clientId === c.clientId}
                onSelect={() => onSelect(c)}
                pinned
                onTogglePin={() => onTogglePin(c.clientId)}
                trend={trends.get(c.clientId)}
              />
            ))}
            {unpinnedClients.length > 0 && (
              <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wide bg-slate-50 border-b border-slate-100">
                All Clients
              </div>
            )}
          </>
        )}

        {unpinnedClients.map((c) => (
          <ClientCard
            key={c.clientId}
            c={c}
            isSelected={selected?.clientId === c.clientId}
            onSelect={() => onSelect(c)}
            pinned={false}
            onTogglePin={() => onTogglePin(c.clientId)}
            trend={trends.get(c.clientId)}
          />
        ))}

        {/* Archived section */}
        {archivedClients.length > 0 && (
          <>
            <button
              onClick={() => setShowArchived((v) => !v)}
              className="w-full px-3 py-2 flex items-center gap-1.5 bg-slate-100 border-t border-slate-200 text-[10px] font-semibold text-slate-500 uppercase tracking-wide hover:bg-slate-200 transition-colors"
            >
              {showArchived ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <Archive className="h-3 w-3" />
              Archived ({archivedClients.length})
            </button>
            {showArchived && archivedClients.map((c) => (
              <div
                key={c.clientId}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(c)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(c)}
                className={cn(
                  "w-full text-left px-3 py-2 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer opacity-60",
                  selected?.clientId === c.clientId && "bg-blue-50 border-l-2 border-l-[#1e3a5f] opacity-100",
                )}
              >
                <div className="flex items-center gap-2">
                  <HealthDot health={c.health} />
                  <span className="text-sm font-medium text-slate-700 truncate flex-1">{c.company}</span>
                  <span className="text-[10px] bg-slate-200 text-slate-500 px-1.5 rounded shrink-0">{c.status}</span>
                </div>
                <div className="mt-0.5 pl-4">
                  <span className="text-[10px] text-slate-400">{c.clientId}</span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
