import type { Client } from "@/types/client"
import type { FeedbackEntry } from "@/types/feedback"
import type { Meeting } from "@/types/meeting"
import type { Task } from "@/types/task"
import type { Target } from "@/types/target"
import type { AdminNote, Enquiry, LeadQual } from "@/types/guidance"
import type { Notification } from "@/types/notification"
import type { AppUser } from "@/types/user"
import { COLS } from "@/constants"

const g = (row: string[], i: number) => row[i] ?? ""

export function parseClient(row: string[], rowNum: number): Client {
  const c = COLS.CLIENT
  return {
    rowNum,
    clientId: g(row, c.ID),
    company: g(row, c.COMPANY),
    industry: g(row, c.INDUSTRY),
    city: g(row, c.CITY),
    startDate: g(row, c.START_DATE),
    durationDays: g(row, c.DURATION_DAYS),
    status: g(row, c.STATUS),
    kam: g(row, c.KAM),
    se: g(row, c.SE),
    contact: g(row, c.CONTACT),
    phone: g(row, c.PHONE),
    health: g(row, c.HEALTH),
    feedbackStatus: g(row, c.FEEDBACK_STATUS),
    aiPriority: g(row, c.AI_PRIORITY),
    lastFeedbackDate: g(row, c.LAST_FEEDBACK_DATE),
    daysSinceFeedback: g(row, c.DAYS_SINCE_FEEDBACK),
    nextFollowup: g(row, c.NEXT_FOLLOWUP),
    overdue: g(row, c.OVERDUE),
    contractValue: g(row, c.CONTRACT_VALUE),
    monthlyValue: g(row, c.MONTHLY_VALUE),
    services: g(row, c.SERVICES),
    kamNotes: g(row, c.KAM_NOTES),
    assignLog: g(row, c.ASSIGN_LOG),
    sheetId: g(row, c.SHEET_ID),
    dashboardId: g(row, c.DASHBOARD_ID),
  }
}

export function parseFeedback(row: string[], rowNum: number): FeedbackEntry {
  const c = COLS.FEEDBACK
  return {
    rowNum,
    date: g(row, c.DATE),
    clientId: g(row, c.CLIENT_ID),
    company: g(row, c.COMPANY),
    kam: g(row, c.KAM),
    seName: g(row, c.SE_NAME),
    interactionType: g(row, c.INTERACTION_TYPE),
    feedbackStatus: g(row, c.FEEDBACK_STATUS),
    healthUpdate: g(row, c.HEALTH_UPDATE),
    whatDiscussed: g(row, c.WHAT_DISCUSSED),
    clientConcern: g(row, c.CLIENT_CONCERN),
    actionRequired: g(row, c.ACTION_REQUIRED),
    actionOwner: g(row, c.ACTION_OWNER),
    actionDueDate: g(row, c.ACTION_DUE_DATE),
    resolutionStatus: g(row, c.RESOLUTION_STATUS),
    currentStatus: g(row, c.CURRENT_STATUS),
    nextFollowupDate: g(row, c.NEXT_FOLLOWUP_DATE),
    aiPriority: g(row, c.AI_PRIORITY),
    loggedAt: g(row, c.LOGGED_AT),
  }
}

export function parseMeeting(row: string[], rowNum: number): Meeting {
  const c = COLS.MEETING
  return {
    rowNum,
    meetingId: g(row, c.ID),
    title: g(row, c.TITLE),
    clientId: g(row, c.CLIENT_ID),
    company: g(row, c.COMPANY),
    kam: g(row, c.KAM),
    se: g(row, c.SE),
    meetingType: g(row, c.MEETING_TYPE),
    date: g(row, c.DATE),
    time: g(row, c.TIME),
    participants: g(row, c.PARTICIPANTS),
    status: g(row, c.STATUS),
    summary: g(row, c.SUMMARY),
    clientFeedback: g(row, c.CLIENT_FEEDBACK),
    discussionPoints: g(row, c.DISCUSSION_POINTS),
    actionItems: g(row, c.ACTION_ITEMS),
    actionOwner: g(row, c.ACTION_OWNER),
    actionDueDate: g(row, c.ACTION_DUE_DATE),
    momShared: g(row, c.MOM_SHARED),
    nextReviewDate: g(row, c.NEXT_REVIEW_DATE),
    scheduledBy: g(row, c.SCHEDULED_BY),
    createdAt: g(row, c.CREATED_AT),
    notes: g(row, c.NOTES),
  }
}

export function parseTask(row: string[], rowNum: number): Task {
  const c = COLS.TASK
  return {
    rowNum,
    taskId: g(row, c.ID),
    clientId: g(row, c.CLIENT_ID),
    company: g(row, c.COMPANY),
    kam: g(row, c.KAM),
    assignedTo: g(row, c.ASSIGNED_TO),
    title: g(row, c.TITLE),
    description: g(row, c.DESCRIPTION),
    department: g(row, c.DEPARTMENT),
    priority: g(row, c.PRIORITY),
    status: g(row, c.STATUS),
    dueDate: g(row, c.DUE_DATE),
    completedDate: g(row, c.COMPLETED_DATE),
    overdue: g(row, c.OVERDUE),
    source: g(row, c.SOURCE),
    notes: g(row, c.NOTES),
  }
}

export function parseTarget(row: string[], rowNum: number): Target {
  const c = COLS.TARGET
  return {
    rowNum,
    period: g(row, c.PERIOD),
    kam: g(row, c.KAM),
    seName: g(row, c.SE_NAME),
    clientId: g(row, c.CLIENT_ID),
    company: g(row, c.COMPANY),
    target: g(row, c.TARGET),
    achieved: g(row, c.ACHIEVED),
    achievementPct: g(row, c.ACHIEVEMENT_PCT),
    status: g(row, c.STATUS),
    notes: g(row, c.NOTES),
    type: g(row, c.TYPE),
  }
}

export function parseAdminNote(row: string[], rowNum: number): AdminNote {
  const c = COLS.ADMIN_NOTE
  return {
    rowNum,
    timestamp: g(row, c.TIMESTAMP),
    clientId: g(row, c.CLIENT_ID),
    company: g(row, c.COMPANY),
    kamAssigned: g(row, c.KAM_ASSIGNED),
    note: g(row, c.NOTE),
    postedBy: g(row, c.POSTED_BY),
    read: g(row, c.READ),
    reaction: g(row, c.REACTION),
    reactionNote: g(row, c.REACTION_NOTE),
    reactedAt: g(row, c.REACTED_AT),
    reactedBy: g(row, c.REACTED_BY),
  }
}

export function parseNotification(row: string[], rowNum: number): Notification {
  const c = COLS.NOTIFICATION
  return {
    rowNum,
    timestamp: g(row, c.TIMESTAMP),
    type: g(row, c.TYPE),
    severity: g(row, c.SEVERITY),
    clientId: g(row, c.CLIENT_ID),
    company: g(row, c.COMPANY),
    kam: g(row, c.KAM),
    message: g(row, c.MESSAGE),
    emailSent: g(row, c.EMAIL_SENT),
    emailTo: g(row, c.EMAIL_TO),
    acknowledged: g(row, c.ACKNOWLEDGED),
    acknowledgedBy: g(row, c.ACKNOWLEDGED_BY),
    ackAt: g(row, c.ACK_AT),
  }
}

export function parseUser(row: string[], rowNum: number): AppUser {
  const c = COLS.USER
  return {
    rowNum,
    email: g(row, c.EMAIL),
    fullName: g(row, c.FULL_NAME),
    role: g(row, c.ROLE),
    kamName: g(row, c.KAM_NAME),
    active: g(row, c.ACTIVE),
  }
}

export function parseLeadQual(row: string[], rowNum: number): LeadQual {
  const c = COLS.LEAD_QUAL
  return {
    rowNum,
    timestamp: g(row, c.TIMESTAMP),
    clientId: g(row, c.CLIENT_ID),
    company: g(row, c.COMPANY),
    kam: g(row, c.KAM),
    leadSource: g(row, c.LEAD_SOURCE),
    leadDetails: g(row, c.LEAD_DETAILS),
    budget: g(row, c.BUDGET),
    decisionMaker: g(row, c.DECISION_MAKER),
    needIdentified: g(row, c.NEED_IDENTIFIED),
    timeline: g(row, c.TIMELINE),
    competition: g(row, c.COMPETITION),
    fitScore: g(row, c.FIT_SCORE),
    qualStatus: g(row, c.QUAL_STATUS),
    notes: g(row, c.NOTES),
    submittedBy: g(row, c.SUBMITTED_BY),
  }
}

export function parseEnquiry(row: string[], enquiryKey: string): Omit<Enquiry, "status" | "trackerNote" | "updatedBy" | "updatedAt"> {
  const c = COLS.ENQUIRY
  return {
    key: enquiryKey,
    email: g(row, c.EMAIL),
    timestamp: g(row, c.TIMESTAMP),
    teamName: g(row, c.TEAM_NAME),
    clientCode: g(row, c.CLIENT_CODE),
    enquiryDate: g(row, c.ENQUIRY_DATE),
    enquiryType: g(row, c.ENQUIRY_TYPE),
    company: g(row, c.COMPANY),
    location: g(row, c.LOCATION),
    industry: g(row, c.INDUSTRY),
    personName: g(row, c.PERSON_NAME),
    designation: g(row, c.DESIGNATION),
    phone: g(row, c.PHONE),
    personEmail: g(row, c.PERSON_EMAIL),
    discussion: g(row, c.DISCUSSION),
    details: g(row, c.DETAILS),
    note: g(row, c.NOTE),
  }
}
