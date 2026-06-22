import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Parse DD/MM/YYYY or DD/MM/YYYY HH:MM:SS (Google Forms format) as well as ISO dates */
export function parseFlexDate(str: string | null | undefined): Date | null {
  if (!str) return null
  const ddmm = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?/)
  if (ddmm) {
    const [, dd, mm, yyyy, hh = "0", min = "0", sec = "0"] = ddmm
    const d = new Date(+yyyy, +mm - 1, +dd, +hh, +min, +sec)
    return isNaN(d.getTime()) ? null : d
  }
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—"
  const d = typeof date === "string" ? parseFlexDate(date) : date
  if (!d || isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

export function daysSince(date: string | null | undefined): number | null {
  if (!date) return null
  const d = new Date(date)
  if (isNaN(d.getTime())) return null
  return Math.floor((Date.now() - d.getTime()) / 86_400_000)
}

export function parsePeriod(period: string): { start: Date; end: Date } | null {
  const m = period.match(/^([A-Za-z]{3})\s+(\d{4})\s+W(\d+)$/i)
  if (!m) return null
  const months: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  }
  const mo = months[m[1].toLowerCase()]
  if (mo === undefined) return null
  const yr = +m[2]
  const wk = +m[3]
  const d1 = (wk - 1) * 7 + 1
  const dMax = new Date(yr, mo + 1, 0).getDate()
  if (d1 > dMax) return null
  const d2 = Math.min(wk * 7, dMax)
  return {
    start: new Date(yr, mo, d1, 0, 0, 0),
    end: new Date(yr, mo, d2, 23, 59, 59),
  }
}

export function getCurrentPeriod(): string {
  const now = new Date()
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${months[now.getMonth()]} ${now.getFullYear()} W${Math.ceil(now.getDate() / 7)}`
}

export function calcBANTScore(
  budget: string,
  dm: string,
  need: string,
  timeline: string,
): number {
  return [budget, dm, need, timeline].filter((v) => v === "Yes").length * 25
}

export function bantLabel(score: number): string {
  if (score >= 75) return "Qualified"
  if (score >= 50) return "Needs More Info"
  return "Not Qualified"
}

/** Escape a string for use as a sheet cell value (prevent formula injection) */
export function esc(value: string): string {
  if (typeof value !== "string") return String(value ?? "")
  if (value.startsWith("=") || value.startsWith("+") || value.startsWith("-") || value.startsWith("@")) {
    return "'" + value
  }
  return value
}

export function toISODate(d: Date): string {
  return d.toISOString().split("T")[0]
}

export function nowIST(): string {
  return new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
}
