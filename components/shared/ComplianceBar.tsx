import { cn } from "@/lib/utils"

export function ComplianceBar({ value, max = 100, className }: { value: number; max?: number; className?: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  const fillColor =
    pct >= 100
      ? "bg-green-500"
      : pct >= 70
        ? "bg-blue-500"
        : pct >= 40
          ? "bg-orange-400"
          : "bg-red-400"

  return (
    <div className={cn("h-2 w-full rounded-full bg-slate-200 overflow-hidden", className)}>
      <div
        className={cn("h-full rounded-full transition-all", fillColor)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
