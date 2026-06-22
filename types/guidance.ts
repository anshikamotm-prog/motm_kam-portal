export interface AdminNote {
  rowNum: number
  timestamp: string
  clientId: string
  company: string
  kamAssigned: string
  note: string
  postedBy: string
  read: string
  reaction: string
  reactionNote: string
  reactedAt: string
  reactedBy: string
}

export interface Enquiry {
  key: string
  email: string
  timestamp: string
  teamName: string
  seName?: string
  clientCode: string
  enquiryDate: string
  enquiryType: string
  company: string
  location: string
  industry: string
  personName: string
  designation: string
  phone: string
  personEmail: string
  discussion: string
  details: string
  note: string
  /** From Enquiry Tracker override */
  status?: string
  trackerNote?: string
  updatedBy?: string
  updatedAt?: string
}

export interface LeadQual {
  rowNum: number
  timestamp: string
  clientId: string
  company: string
  kam: string
  leadSource: string
  leadDetails: string
  budget: string
  decisionMaker: string
  needIdentified: string
  timeline: string
  competition: string
  fitScore: string
  qualStatus: string
  notes: string
  submittedBy: string
}

export interface TimelineEvent {
  id: string
  type: "feedback" | "meeting" | "task" | "guidance"
  date: string
  title: string
  subtitle?: string
  details?: string
  status?: string
  actor?: string
}
