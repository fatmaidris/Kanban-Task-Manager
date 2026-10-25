export type TaskStatus = "todo" | "in-progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  createdAt: string;
}

export const taskStatuses = ["todo", "in-progress", "done"] as const satisfies readonly TaskStatus[];
export const taskPriorities = ["low", "medium", "high"] as const satisfies readonly TaskPriority[];