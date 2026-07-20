import type { Client } from "@/types/client"
import type { Meeting } from "@/types/meeting"
import type { Task } from "@/types/task"
import type { FeedbackEntry } from "@/types/feedback"
import { daysSince } from "@/lib/utils"

export interface KAMComplianceScore {
  kamName: string
  feedbackScore: number
  meetingScore: number
  momScore: number
  taskScore: number
  statusScore: number
  total: number
  level: "Excellent" | "Good" | "Needs Improvement" | "Critical"
  noFeedbackClients: Client[]
  noMeetingClients: Client[]
  noActivityClients: Client[]
  highRiskClients: Client[]
}

export function computeCompliance(
  kamName: string,
  clients: Client[],
  feedback: FeedbackEntry[],
  meetings: Meeting[],
  tasks: Task[],
): KAMComplianceScore {
  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

  const myClients = clients.filter((c) => c.kam === kamName)
  const total = myClients.length || 1

  // Feedback score: clients with feedback in last 7 days
  const withFeedback = myClients.filter((c) => {
    const days = daysSince(c.lastFeedbackDate)
    return days !== null && days <= 7
  })
  const feedbackScore = Math.round((withFeedback.length / total) * 25)

  // Meeting score
  const myMeetings = meetings.filter((m) => m.kam === kamName)
  const scheduledThisMonth = myMeetings.filter((m) => m.date?.startsWith(thisMonth))
  const completedThisMonth = scheduledThisMonth.filter((m) =>
    m.status === "Completed" || m.status === "Pending Documentation",
  )
  const meetingScore =
    scheduledThisMonth.length > 0
      ? Math.round((completedThisMonth.length / scheduledThisMonth.length) * 25)
      : 0

  // MOM score
  const momMeetings = myMeetings.filter(
    (m) => m.status === "Completed" || m.status === "Pending Documentation",
  )
  const momShared = momMeetings.filter((m) => m.momShared === "Yes").length
  const momPending = momMeetings.filter((m) => m.momShared !== "Yes").length
  const momScore =
    momShared + momPending > 0
      ? Math.round((momShared / (momShared + momPending)) * 20)
      : 0

  // Task score
  const myTasks = tasks.filter((t) => t.kam === kamName)
  const doneTasks = myTasks.filter((t) => t.status === "Done" || t.status === "Completed").length
  const taskScore =
    myTasks.length > 0
      ? Math.round((doneTasks / myTasks.length) * 15)
      : 0

  // Status score: clients updated in last 14 days
  const updatedRecently = myClients.filter((c) => {
    const days = daysSince(c.lastFeedbackDate)
    return days !== null && days <= 14
  })
  const statusScore = Math.round((updatedRecently.length / total) * 15)

  const totalScore = feedbackScore + meetingScore + momScore + taskScore + statusScore

  const level =
    totalScore >= 90
      ? "Excellent"
      : totalScore >= 75
        ? "Good"
        : totalScore >= 50
          ? "Needs Improvement"
          : "Critical"

  const noFeedbackClients = myClients.filter((c) => {
    const d = daysSince(c.lastFeedbackDate)
    return d === null || d >= 7
  })
  const noMeetingClients = myClients.filter((c) => {
    const lastMeeting = myMeetings
      .filter((m) => m.clientId === c.clientId && (m.status === "Completed"))
      .sort((a, b) => b.date.localeCompare(a.date))[0]
    if (!lastMeeting) return true
    const d = daysSince(lastMeeting.date)
    return d !== null && d >= 30
  })
  const noActivityClients = myClients.filter((c) => {
    const lastFeedback = daysSince(c.lastFeedbackDate)
    const lastMeeting = myMeetings
      .filter((m) => m.clientId === c.clientId)
      .sort((a, b) => b.date.localeCompare(a.date))[0]
    const lastMeetingDays = lastMeeting ? daysSince(lastMeeting.date) : null
    const lastTask = tasks
      .filter((t) => t.clientId === c.clientId)
      .sort((a, b) => b.dueDate.localeCompare(a.dueDate))[0]
    const lastTaskDays = lastTask ? daysSince(lastTask.dueDate) : null
    const minDays = [lastFeedback, lastMeetingDays, lastTaskDays].filter((d): d is number => d !== null)
    return minDays.length === 0 || Math.min(...minDays) >= 15
  })
  const highRiskClients = myClients.filter(
    (c) =>
      c.health === "Red" ||
      c.feedbackStatus === "Intent to Leave" ||
      c.feedbackStatus === "Planning to Leave",
  )

  return {
    kamName,
    feedbackScore,
    meetingScore,
    momScore,
    taskScore,
    statusScore,
    total: totalScore,
    level,
    noFeedbackClients,
    noMeetingClients,
    noActivityClients,
    highRiskClients,
  }
}
