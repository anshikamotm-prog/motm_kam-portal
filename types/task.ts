export interface Task {
  rowNum: number
  taskId: string
  clientId: string
  company: string
  kam: string
  assignedTo: string
  title: string
  description: string
  department: string
  priority: string
  status: string
  dueDate: string
  completedDate: string
  overdue: string
  source: string
  notes: string
}

export interface AddTaskInput {
  clientId?: string
  company?: string
  kam?: string
  assignedTo?: string
  title: string
  description?: string
  department?: string
  priority: string
  dueDate: string
  source?: string
  notes?: string
}
