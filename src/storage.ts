import type { Task, TaskPriority, TaskStatus } from "./types.js";
import { taskPriorities, taskStatuses } from "./types.js";

const STORAGE_KEY = "kanban-tasks";

function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === "string" && taskStatuses.some((status) => status === value);
}

function isTaskPriority(value: unknown): value is TaskPriority {
  return typeof value === "string" && taskPriorities.some((priority) => priority === value);
}

function normalizeTask(value: unknown): Task | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const task = value as Record<string, unknown>;
  if (
    typeof task.id !== "string" ||
    typeof task.title !== "string" ||
    typeof task.description !== "string" ||
    !isTaskStatus(task.status) ||
    typeof task.createdAt !== "string" ||
    !Number.isFinite(Date.parse(task.createdAt))
  ) {
    return null;
  }

  const priority = task.priority === undefined ? "medium" : task.priority;
  const dueDate = task.dueDate === undefined ? "" : task.dueDate;
  if (!isTaskPriority(priority) || typeof dueDate !== "string") {
    return null;
  }

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority,
    dueDate,
    createdAt: task.createdAt,
  };
}

export function loadTasks(): Task[] {
  try {
    const savedValue: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(savedValue)
      ? savedValue.map(normalizeTask).filter((task): task is Task => task !== null)
      : [];
  } catch {
    return [];
  }
}

export function saveTasks(tasks: Task[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    console.error("Your browser could not save the tasks. Check that local storage is available.");
  }
}