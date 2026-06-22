import { useQuery } from "@tanstack/react-query"

export interface SESummaryRow { se: string; target: number; achieved: number; pct: number }
export interface KAMSummaryRow { kam: string; target: number; achieved: number; pct: number; bySE: SESummaryRow[] }
export interface TargetsSummary {
  period: string
  isMonthly: boolean
  byKAM: KAMSummaryRow[]
  total: { target: number; achieved: number; pct: number }
}

export function useTargetsSummary(period: string) {
  return useQuery<TargetsSummary>({
    queryKey: ["targets-summary", period],
    queryFn: () =>
      fetch(`/api/targets/summary?period=${encodeURIComponent(period)}`).then((r) => r.json()),
    enabled: !!period,
    staleTime: 60_000,
  })
}
