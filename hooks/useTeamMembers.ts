"use client"
import { useQuery } from "@tanstack/react-query"

export function useTeamMembers(kam?: string) {
  const params = kam ? `?kam=${encodeURIComponent(kam)}` : ""
  return useQuery<{ fullName: string; role: string }[]>({
    queryKey: ["team-members", kam ?? ""],
    queryFn: () => fetch(`/api/users${params}`).then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  })
}
