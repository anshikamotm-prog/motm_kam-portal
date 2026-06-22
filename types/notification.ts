export interface Notification {
  rowNum: number
  timestamp: string
  type: string
  severity: "Low" | "Medium" | "High" | "Critical" | string
  clientId: string
  company: string
  kam: string
  message: string
  emailSent: string
  emailTo: string
  acknowledged: string
  acknowledgedBy: string
  ackAt: string
}
