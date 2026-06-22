export interface Meeting {
  rowNum: number
  meetingId: string
  title: string
  clientId: string
  company: string
  kam: string
  se: string
  meetingType: string
  date: string
  time: string
  participants: string
  status: string
  summary: string
  clientFeedback: string
  discussionPoints: string
  actionItems: string
  actionOwner: string
  actionDueDate: string
  momShared: string
  nextReviewDate: string
  scheduledBy: string
  createdAt: string
  notes: string
}

export interface ScheduleMeetingInput {
  title: string
  clientId: string
  company: string
  meetingType: string
  date: string
  time: string
  participants: string
  notes?: string
}

export interface CompleteMeetingInput {
  summary: string
  clientFeedback: string
  discussionPoints: string
  actionItems: string
  actionOwner: string
  actionDueDate: string
  momShared: "Yes" | "No" | "Pending"
  nextReviewDate: string
}
