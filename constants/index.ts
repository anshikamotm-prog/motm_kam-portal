export const SHEET_ID = "1L_0mPRhs7Icp2AdmNClbh7ba6vmxiorJtypichc5x9U"
export const ENQUIRY_SHEET_ID = "1444uPZ_A7WQohOph64WP1C7f-gR-YE1DQK3KYCPZGko"


export const GCHAT_WEBHOOK_URL = process.env.GCHAT_WEBHOOK_URL

export const STATUS_OPTIONS = [
  "New", "Pending", "E. Started", "C. Started", "Closed",
  "On Hold", "On Notice", "Uncountable", "Resume Activity", "Digital Activity",
] as const

export const HEALTH_OPTIONS = ["Green", "Orange", "Red", "Unset"] as const

export const FEEDBACK_STATUS = [
  "Positive", "Neutral", "On Notice", "Planning to Leave",
  "Intent to Leave", "At Risk",
] as const

export const INTERACTION_TYPES = [
  "Call", "Video Call", "Physical Visit", "WhatsApp",
  "Email", "Site Visit", "Review Meeting",
] as const

export const MEETING_TYPES = [
  "Weekly Review", "Monthly Review", "Client Feedback Meeting",
  "Technical Discussion", "Strategy Meeting", "Physical Visit",
  "Internal Review", "Onboarding Call", "Ad hoc Call",
] as const

export const MEETING_STATUSES = [
  "Scheduled", "Completed", "Pending Documentation",
  "Cancelled", "Rescheduled", "Missed",
] as const

export const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Critical"] as const

export const ACTION_OWNERS = [
  "KAM", "SE", "Digital Team", "Management", "BD", "Client", "Shared",
] as const

export const TARGET_TYPES = ["Enquiries", "Visits", "Revenue", "Other"] as const

// Sheet tab names
export const SHEETS = {
  CLIENT_MASTER: "Client Master",
  FEEDBACK_LOG: "Feedback Log",
  TASK_TRACKER: "Task Tracker",
  TARGETS: "Targets",
  MEETING_SCHEDULE: "Meeting Schedule",
  ADMIN_NOTES: "Admin Notes",
  USERS: "Users",
  NOTIFICATION_LOG: "Notification Log",
  AUDIT_LOG: "Audit Log",
  ENQUIRY_TRACKER: "Enquiry Tracker",
  LEAD_QUALIFICATION: "Lead Qualification",
} as const

// Column indices (0-based) for each sheet
export const COLS = {
  CLIENT: {
    ID: 0, COMPANY: 1, INDUSTRY: 2, CITY: 3, START_DATE: 4,
    DURATION_DAYS: 5, STATUS: 6, KAM: 7, SE: 8, CONTACT: 9,
    PHONE: 10, HEALTH: 11, FEEDBACK_STATUS: 12, AI_PRIORITY: 13,
    LAST_FEEDBACK_DATE: 14, DAYS_SINCE_FEEDBACK: 15, NEXT_FOLLOWUP: 16,
    OVERDUE: 17, CONTRACT_VALUE: 18, MONTHLY_VALUE: 19, SERVICES: 20,
    KAM_NOTES: 21, ASSIGN_LOG: 22, SHEET_ID: 23, DASHBOARD_ID: 24,
  },
  FEEDBACK: {
    DATE: 0, CLIENT_ID: 1, COMPANY: 2, KAM: 3, SE_NAME: 4, INTERACTION_TYPE: 5,
    FEEDBACK_STATUS: 6, HEALTH_UPDATE: 7, WHAT_DISCUSSED: 8, CLIENT_CONCERN: 9,
    ACTION_REQUIRED: 10, ACTION_OWNER: 11, ACTION_DUE_DATE: 12, RESOLUTION_STATUS: 13,
    CURRENT_STATUS: 14, NEXT_FOLLOWUP_DATE: 15, AI_PRIORITY: 16, LOGGED_AT: 17,
  },
  TASK: {
    ID: 0, CLIENT_ID: 1, COMPANY: 2, KAM: 3, ASSIGNED_TO: 4, TITLE: 5,
    DESCRIPTION: 6, DEPARTMENT: 7, PRIORITY: 8, STATUS: 9, DUE_DATE: 10,
    COMPLETED_DATE: 11, OVERDUE: 12, SOURCE: 13, NOTES: 14,
  },
  TARGET: {
    PERIOD: 0, KAM: 1, SE_NAME: 2, CLIENT_ID: 3, COMPANY: 4,
    TARGET: 5, ACHIEVED: 6, ACHIEVEMENT_PCT: 7, STATUS: 8, NOTES: 9, TYPE: 10,
  },
  MEETING: {
    ID: 0, TITLE: 1, CLIENT_ID: 2, COMPANY: 3, KAM: 4, SE: 5,
    MEETING_TYPE: 6, DATE: 7, TIME: 8, PARTICIPANTS: 9, STATUS: 10,
    SUMMARY: 11, CLIENT_FEEDBACK: 12, DISCUSSION_POINTS: 13, ACTION_ITEMS: 14,
    ACTION_OWNER: 15, ACTION_DUE_DATE: 16, MOM_SHARED: 17, NEXT_REVIEW_DATE: 18,
    SCHEDULED_BY: 19, CREATED_AT: 20, NOTES: 21,
  },
  ADMIN_NOTE: {
    TIMESTAMP: 0, CLIENT_ID: 1, COMPANY: 2, KAM_ASSIGNED: 3, NOTE: 4,
    POSTED_BY: 5, READ: 6, REACTION: 7, REACTION_NOTE: 8, REACTED_AT: 9, REACTED_BY: 10,
  },
  USER: { EMAIL: 0, FULL_NAME: 1, ROLE: 2, KAM_NAME: 3, ACTIVE: 4 },
  NOTIFICATION: {
    TIMESTAMP: 0, TYPE: 1, SEVERITY: 2, CLIENT_ID: 3, COMPANY: 4, KAM: 5,
    MESSAGE: 6, EMAIL_SENT: 7, EMAIL_TO: 8, ACKNOWLEDGED: 9, ACKNOWLEDGED_BY: 10, ACK_AT: 11,
  },
  AUDIT: {
    TIMESTAMP: 0, USER_EMAIL: 1, USER_NAME: 2, ROLE: 3, ACTION: 4, CLIENT_ID: 5, COMPANY: 6, DETAILS: 7,
  },
  ENQUIRY_TRACKER: {
    KEY: 0, CLIENT_CODE: 1, STATUS: 2, NOTE: 3, UPDATED_BY: 4, UPDATED_AT: 5,
  },
  LEAD_QUAL: {
    TIMESTAMP: 0, CLIENT_ID: 1, COMPANY: 2, KAM: 3, LEAD_SOURCE: 4,
    LEAD_DETAILS: 5, BUDGET: 6, DECISION_MAKER: 7, NEED_IDENTIFIED: 8,
    TIMELINE: 9, COMPETITION: 10, FIT_SCORE: 11, QUAL_STATUS: 12, NOTES: 13, SUBMITTED_BY: 14,
  },
  ENQUIRY: {
    EMAIL: 0, TIMESTAMP: 1, TEAM_NAME: 2, CLIENT_CODE: 3, ENQUIRY_DATE: 4,
    ENQUIRY_TYPE: 5, COMPANY: 6, LOCATION: 7, INDUSTRY: 8, PERSON_NAME: 9,
    DESIGNATION: 10, PHONE: 11, PERSON_EMAIL: 12, DISCUSSION: 13, DETAILS: 14, NOTE: 15,
  },
} as const
