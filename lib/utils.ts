import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Parse DD/MM/YYYY or DD/MM/YYYY HH:MM:SS (Google Forms format) as well as ISO dates */
export function parseFlexDate(str: string | null | undefined): Date | null {
  if (!str) return null
  // Handles DD/MM/YYYY, DD/MM/YYYY HH:MM:SS, and en-IN locale "D/M/YYYY, HH:MM:SS [am/pm]" (H-1)
  const ddmm = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[T\s,]+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*[aApP][mM])?)?/)
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
  const d = parseFlexDate(date)
  if (!d) return null
  return Math.floor((Date.now() - d.getTime()) / 86_400_000)
}

// ── ISO week helpers ────────────────────────────────────────────────────────
// ISO week 1 of year Y = the week containing the first Thursday of Y (Jan 4 is always in W01).
// All weeks run Mon–Sun.

export function getISOWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7 // Mon=1 … Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum) // shift to Thursday of same week
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return { year: d.getUTCFullYear(), week }
}

function getISOWeekMonday(year: number, week: number): Date {
  const jan4 = new Date(year, 0, 4)
  const dow = jan4.getDay() || 7
  const w1Mon = new Date(year, 0, 4 - (dow - 1))
  return new Date(w1Mon.getFullYear(), w1Mon.getMonth(), w1Mon.getDate() + (week - 1) * 7)
}

/** Period format: "2026 W26" */
export function parsePeriod(period: string): { start: Date; end: Date } | null {
  const m = period.match(/^(\d{4})\s+W(\d{1,2})$/)
  if (!m) return null
  const monday = getISOWeekMonday(+m[1], +m[2])
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59)
  return { start: monday, end: sunday }
}

export function getCurrentPeriod(): string {
  const { year, week } = getISOWeek(new Date())
  return `${year} W${String(week).padStart(2, "0")}`
}

/** "2026 W26" → "2026 W26  (22 Jun – 28 Jun)" */
export function formatPeriodLabel(period: string): string {
  const range = parsePeriod(period)
  if (!range) return period
  const MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  const fmt = (d: Date) => `${d.getDate()} ${MO[d.getMonth()]}`
  return `${period}  (${fmt(range.start)} – ${fmt(range.end)})`
}

/** "2026 W26" → "Jun 2026" (month of the Monday) */
export function isoWeekToMonth(period: string): string {
  const range = parsePeriod(period)
  if (!range) return ""
  const MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  return `${MO[range.start.getMonth()]} ${range.start.getFullYear()}`
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
