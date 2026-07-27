import { Badge } from "@/components/ui/badge"
import type { BadgeProps } from "@/components/ui/badge"

function healthVariant(health: string): BadgeProps["variant"] {
  if (health === "Green") return "green"
  if (health === "Orange") return "orange"
  if (health === "Red") return "red"
  return "gray"
}

function feedbackVariant(status: string): BadgeProps["variant"] {
  if (status === "Positive") return "green"
  if (status === "Neutral") return "gray"
  if (status === "Negative") return "orange"
  if (status === "On Notice") return "yellow"
  if (status === "Planning to Leave") return "orange"
  if (status === "Intent to Leave" || status === "At Risk") return "red"
  return "gray"
}

function clientStatusVariant(status: string): BadgeProps["variant"] {
  if (status === "E. Started" || status === "C. Started") return "green"
  if (status === "New" || status === "Resume Activity") return "blue"
  if (status === "Closed" || status === "On Notice") return "red"
  if (status === "On Hold") return "yellow"
  if (status === "Uncountable" || status === "Digital Activity") return "purple"
  return "gray"
}

function priorityVariant(priority: string): BadgeProps["variant"] {
  if (priority === "Critical") return "red"
  if (priority === "High") return "orange"
  if (priority === "Medium") return "blue"
  return "gray"
}

function meetingStatusVariant(status: string): BadgeProps["variant"] {
  if (status === "Completed") return "green"
  if (status === "Scheduled") return "blue"
  if (status === "Pending Documentation") return "yellow"
  if (status === "Missed") return "red"
  if (status === "Rescheduled") return "orange"
  return "gray"
}

function targetStatusVariant(status: string): BadgeProps["variant"] {
  if (status === "Achieved") return "green"
  if (status === "On Track") return "blue"
  if (status === "Behind") return "orange"
  if (status === "At Risk") return "red"
  return "gray"
}

export function HealthBadge({ health }: { health: string }) {
  return <Badge variant={healthVariant(health)}>{health}</Badge>
}

export function FeedbackBadge({ status }: { status: string }) {
  return <Badge variant={feedbackVariant(status)}>{status}</Badge>
}

export function ClientStatusBadge({ status }: { status: string }) {
  return <Badge variant={clientStatusVariant(status)}>{status}</Badge>
}

export function PriorityBadge({ priority }: { priority: string }) {
  return <Badge variant={priorityVariant(priority)}>{priority}</Badge>
}

export function MeetingStatusBadge({ status }: { status: string }) {
  return <Badge variant={meetingStatusVariant(status)}>{status}</Badge>
}

export function TargetStatusBadge({ status }: { status: string }) {
  return <Badge variant={targetStatusVariant(status)}>{status}</Badge>
}
