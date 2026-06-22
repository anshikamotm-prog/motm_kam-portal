export interface FeedbackEntry {
  rowNum: number
  date: string
  clientId: string
  company: string
  kam: string
  seName: string
  interactionType: string
  feedbackStatus: string
  healthUpdate: string
  whatDiscussed: string
  clientConcern: string
  actionRequired: string
  actionOwner: string
  actionDueDate: string
  resolutionStatus: string
  currentStatus: string
  nextFollowupDate: string
  aiPriority: string
  loggedAt: string
}

export interface FeedbackInput {
  date: string
  clientId: string
  company: string
  seName: string
  interactionType: string
  feedbackStatus: string
  healthUpdate: string
  whatDiscussed: string
  clientConcern?: string
  actionRequired?: string
  actionOwner?: string
  actionDueDate?: string
  resolutionStatus?: string
  currentStatus?: string
  nextFollowupDate?: string
}
