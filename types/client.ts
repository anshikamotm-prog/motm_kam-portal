export interface Client {
  rowNum: number
  clientId: string
  company: string
  industry: string
  city: string
  startDate: string
  durationDays: string
  status: string
  kam: string
  se: string
  contact: string
  phone: string
  health: "Green" | "Orange" | "Red" | "Unset" | string
  feedbackStatus: string
  aiPriority: string
  lastFeedbackDate: string
  daysSinceFeedback: string
  nextFollowup: string
  overdue: string
  contractValue: string
  monthlyValue: string
  services: string
  kamNotes: string
  assignLog: string
  sheetId: string
  dashboardId: string
}
