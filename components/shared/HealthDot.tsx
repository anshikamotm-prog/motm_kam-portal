import { cn } from "@/lib/utils"

const colorMap: Record<string, string> = {
  Green: "bg-[#22c55e]",
  Orange: "bg-[#f97316]",
  Red: "bg-[#ef4444]",
  Unset: "bg-[#cbd5e1]",
}

export function HealthDot({ health, className }: { health: string; className?: string }) {
  return (
    <span
      className={cn("inline-block w-2.5 h-2.5 rounded-full flex-shrink-0", colorMap[health] ?? "bg-slate-300", className)}
      title={health}
    />
  )
}
