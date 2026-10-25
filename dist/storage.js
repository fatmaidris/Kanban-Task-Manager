import { taskPriorities, taskStatuses } from "./types.js";
const STORAGE_KEY = "kanban-tasks";
function isTaskStatus(value) {
    return typeof value === "string" && taskStatuses.some((status) => status === value);
}
function isTaskPriority(value) {
    return typeof value === "string" && taskPriorities.some((priority) => priority === value);
}
function normalizeTask(value) {
    if (typeof value !== "object" || value === null) {
        return null;
    }
    const task = value;
    if (typeof task.id !== "string" ||
        typeof task.title !== "string" ||
        typeof task.description !== "string" ||
        !isTaskStatus(task.status) ||
        typeof task.createdAt !== "string" ||
        !Number.isFinite(Date.parse(task.createdAt))) {
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
export function loadTasks() {
    try {
        const savedValue = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
        return Array.isArray(savedValue)
            ? savedValue.map(normalizeTask).filter((task) => task !== null)
            : [];
    }
    catch {
        return [];
    }
}
export function saveTasks(tasks) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    }
    catch {
        console.error("Your browser could not save the tasks. Check that local storage is available.");
    }
}
//# sourceMappingURL=storage.js.map