"use client"
import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import type { FeedbackEntry } from "@/types/feedback"

const HEALTH_SCORE: Record<string, number> = { Green: 3, Orange: 2, Red: 1 }

// Returns a map of clientId → trend direction, computed from last 30 days feedback.
// Compares the two most recent healthUpdate values per client.
export function useHealthTrends(): Map<string, "up" | "down" | "same"> {
  const { data } = useQuery<FeedbackEntry[]>({
    queryKey: ["feedback"],
    queryFn: () => fetch("/api/feedback").then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  })

  return useMemo(() => {
    if (!Array.isArray(data)) return new Map()
    // API returns data sorted newest first; collect first 2 health values per client
    const byClient = new Map<string, string[]>()
    for (const f of data) {
      if (!f.clientId || !f.healthUpdate) continue
      const arr = byClient.get(f.clientId)
      if (!arr) byClient.set(f.clientId, [f.healthUpdate])
      else if (arr.length < 2) arr.push(f.healthUpdate)
    }
    const result = new Map<string, "up" | "down" | "same">()
    for (const [clientId, entries] of byClient) {
      if (entries.length < 2) continue
      const s0 = HEALTH_SCORE[entries[0]] ?? 0
      const s1 = HEALTH_SCORE[entries[1]] ?? 0
      result.set(clientId, s0 > s1 ? "up" : s0 < s1 ? "down" : "same")
    }
    return result
  }, [data])
}
