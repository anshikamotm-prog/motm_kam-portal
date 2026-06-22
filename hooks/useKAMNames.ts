"use client"
import { useQuery } from "@tanstack/react-query"

export function useKAMNames() {
  return useQuery<string[]>({
    queryKey: ["kam-names"],
    queryFn: () => fetch("/api/kam-names").then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  })
}
