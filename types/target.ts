export interface Target {
  rowNum: number
  period: string
  kam: string
  seName: string
  clientId: string
  company: string
  target: string
  achieved: string
  achievementPct: string
  status: string
  notes: string
  type: string
  /** Auto-computed for Enquiries type — not stored in sheet */
  enquiryCount?: number
  /** Auto-computed for Email Response type — not stored in sheet */
  emailResponseCount?: number
}

export interface AddTargetInput {
  period?: string
  kam: string
  seName: string
  clientId: string
  company: string
  target: string
  type: string
  notes?: string
}
