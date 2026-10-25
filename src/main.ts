import { loadTasks, saveTasks } from "./storage.js";
import type { Task, TaskPriority, TaskStatus } from "./types.js";

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`The required page element "${id}" was not found.`);
  }
  return element as T;
}

const taskDialog = getElement<HTMLDialogElement>("task-dialog");
const taskForm = getElement<HTMLFormElement>("task-form");
const titleInput = getElement<HTMLInputElement>("task-title");
const descriptionInput = getElement<HTMLTextAreaElement>("task-description");
const prioritySelect = getElement<HTMLSelectElement>("task-priority");
const dueDateInput = getElement<HTMLInputElement>("task-due-date");
const descriptionCount = getElement<HTMLElement>("description-count");
const statusSelect = getElement<HTMLSelectElement>("task-status");
const statusField = getElement<HTMLDivElement>("status-field");
const titleError = getElement<HTMLParagraphElement>("title-error");
const dialogTitle = getElement<HTMLHeadingElement>("dialog-title");
const dialogEyebrow = getElement<HTMLParagraphElement>("dialog-eyebrow");
const saveButton = getElement<HTMLButtonElement>("save-task-button");
const todoList = getElement<HTMLDivElement>("todo-list");
const progressList = getElement<HTMLDivElement>("progress-list");
const doneList = getElement<HTMLDivElement>("done-list");
const taskLists: Record<TaskStatus, HTMLDivElement> = {
  todo: todoList,
  "in-progress": progressList,
  done: doneList,
};
const countElements: Record<TaskStatus, HTMLElement> = {
  todo: getElement<HTMLElement>("todo-count"),
  "in-progress": getElement<HTMLElement>("progress-count"),
  done: getElement<HTMLElement>("done-count"),
};
const emptyElements: Record<TaskStatus, HTMLElement> = {
  todo: getElement<HTMLElement>("todo-empty"),
  "in-progress": getElement<HTMLElement>("progress-empty"),
  done: getElement<HTMLElement>("done-empty"),
};

const confirmDialog = getElement<HTMLDialogElement>("confirm-dialog");
const confirmTaskTitle = getElement<HTMLElement>("confirm-task-title");
const cancelDeleteButton = getElement<HTMLButtonElement>("cancel-delete-button");
const confirmDeleteButton = getElement<HTMLButtonElement>("confirm-delete-button");

let tasks: Task[] = loadTasks();
let editingTaskId: string | null = null;
let deletingTaskId: string | null = null;
let fallbackIdCounter = 0;

const statusLabels: Record<TaskStatus, string> = {
  todo: "To Do",
  "in-progress": "In Progress",
  done: "Completed",
};
const availableMoves: Record<TaskStatus, readonly TaskStatus[]> = {
  todo: ["in-progress", "done"],
  "in-progress": ["todo", "done"],
  done: ["todo", "in-progress"],
};
const moveLabels: Record<TaskStatus, Partial<Record<TaskStatus, string>>> = {
  todo: { "in-progress": "Start", done: "Complete" },
  "in-progress": { todo: "Move to To Do", done: "Complete" },
  done: { todo: "Move to To Do", "in-progress": "Move to In Progress" },
};
const moveIcons: Record<TaskStatus, Partial<Record<TaskStatus, string>>> = {
  todo: { "in-progress": "▶", done: "✓" },
  "in-progress": { todo: "↺", done: "✓" },
  done: { todo: "↺", "in-progress": "▶" },
};

function formatDueDate(dueDateString: string): string | null {
  if (!dueDateString) {
    return null;
  }
  const parsedDate = new Date(`${dueDateString}T00:00:00`);
  if (!Number.isFinite(parsedDate.getTime())) {
    return null;
  }
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
    }).format(parsedDate);
  } catch {
    return null;
  }
}

function formatCreatedDate(createdAtString: string): string {
  const parsedDate = new Date(createdAtString);
  if (Number.isFinite(parsedDate.getTime())) {
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(parsedDate);
    } catch {
      // Fallback below
    }
  }
  return createdAtString;
}

function createTaskId(existingTasks: readonly Task[]): string {
  const cryptoApi = typeof globalThis.crypto === "undefined" ? undefined : globalThis.crypto;
  const usedIds = new Set(existingTasks.map((task) => task.id));
  let candidate: string;

  do {
    if (typeof cryptoApi?.randomUUID === "function") {
      candidate = cryptoApi.randomUUID();
    } else if (typeof cryptoApi?.getRandomValues === "function") {
      const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
      candidate = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    } else {
      candidate = `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${fallbackIdCounter}`;
      fallbackIdCounter += 1;
    }
  } while (usedIds.has(candidate));

  return candidate;
}

function makeTaskCard(task: Task, taskNumber: number): HTMLElement {
  const card = document.createElement("article");
  card.className = "task-card";

  const number = document.createElement("p");
  number.className = "task-number";
  number.textContent = `TASK ${String(taskNumber).padStart(3, "0")}`;
  card.append(number);

  const heading = document.createElement("h3");
  heading.textContent = task.title;
  card.append(heading);

  const priority = document.createElement("span");
  priority.className = `priority-badge priority-${task.priority}`;
  priority.textContent = `${task.priority[0].toUpperCase()}${task.priority.slice(1)} priority`;
  card.append(priority);

  const description = document.createElement("p");
  description.className = "task-description";
  description.textContent = task.description;
  if (task.description.length === 0) {
    description.classList.add("is-empty");
  }
  card.append(description);

  const formattedDueDate = formatDueDate(task.dueDate);
  if (formattedDueDate !== null) {
    const dueDate = document.createElement("p");
    dueDate.className = "task-due-date";
    const dateIcon = document.createElement("span");
    dateIcon.className = "meta-icon";
    dateIcon.setAttribute("aria-hidden", "true");
    dateIcon.textContent = "🗓";
    dueDate.append(dateIcon, document.createTextNode(`Due ${formattedDueDate}`));
    card.append(dueDate);
  }

  const createdDate = document.createElement("p");
  createdDate.className = "task-meta";
  const timeIcon = document.createElement("span");
  timeIcon.className = "meta-icon";
  timeIcon.setAttribute("aria-hidden", "true");
  timeIcon.textContent = "⏱";
  createdDate.append(timeIcon, document.createTextNode(`Created ${formatCreatedDate(task.createdAt)}`));
  card.append(createdDate);

  const actions = document.createElement("div");
  actions.className = "task-actions";

  for (const destination of availableMoves[task.status]) {
    const moveButton = document.createElement("button");
    moveButton.className = "task-action task-action-move";
    moveButton.type = "button";

    const iconSpan = document.createElement("span");
    iconSpan.className = "action-icon";
    iconSpan.setAttribute("aria-hidden", "true");
    iconSpan.textContent = moveIcons[task.status][destination] ?? "→";

    const labelSpan = document.createElement("span");
    labelSpan.textContent = moveLabels[task.status][destination] ?? `Move to ${statusLabels[destination]}`;

    moveButton.append(iconSpan, labelSpan);
    moveButton.setAttribute("aria-label", `Move ${task.title} to ${statusLabels[destination]}`);
    moveButton.addEventListener("click", () => changeTaskStatus(task.id, destination));
    actions.append(moveButton);
  }

  const editButton = document.createElement("button");
  editButton.className = "task-action";
  editButton.type = "button";
  const editIcon = document.createElement("span");
  editIcon.className = "action-icon";
  editIcon.setAttribute("aria-hidden", "true");
  editIcon.textContent = "✎";
  const editLabel = document.createElement("span");
  editLabel.textContent = "Edit";
  editButton.append(editIcon, editLabel);
  editButton.setAttribute("aria-label", `Edit ${task.title}`);
  editButton.addEventListener("click", () => openEditDialog(task));

  const deleteButton = document.createElement("button");
  deleteButton.className = "task-action task-action-delete";
  deleteButton.type = "button";
  const deleteIcon = document.createElement("span");
  deleteIcon.className = "action-icon";
  deleteIcon.setAttribute("aria-hidden", "true");
  deleteIcon.textContent = "🗑";
  const deleteLabel = document.createElement("span");
  deleteLabel.textContent = "Delete";
  deleteButton.append(deleteIcon, deleteLabel);
  deleteButton.setAttribute("aria-label", `Delete ${task.title}`);
  deleteButton.addEventListener("click", () => openDeleteDialog(task));

  actions.append(editButton, deleteButton);
  card.append(actions);
  return card;
}

function renderTasks(): void {
  for (const status of ["todo", "in-progress", "done"] as const) {
    const columnTasks = tasks
      .map((task, index) => ({ task, taskNumber: index + 1 }))
      .filter(({ task }) => task.status === status);
    taskLists[status].replaceChildren(
      ...columnTasks.map(({ task, taskNumber }) => makeTaskCard(task, taskNumber)),
    );
    countElements[status].textContent = String(columnTasks.length);
    emptyElements[status].hidden = columnTasks.length > 0;
  }
}

function saveAndRender(): void {
  saveTasks(tasks);
  renderTasks();
}

function changeTaskStatus(taskId: string, status: TaskStatus): void {
  tasks = tasks.map((task) => (task.id === taskId ? { ...task, status } : task));
  saveAndRender();
}

function openNewDialog(): void {
  editingTaskId = null;
  taskForm.reset();
  titleError.textContent = "";
  prioritySelect.value = "medium";
  descriptionCount.textContent = "0";
  statusField.hidden = true;
  dialogEyebrow.textContent = "YOUR NEXT STEP";
  dialogTitle.textContent = "Create New Task";
  saveButton.textContent = "Add Task";
  taskDialog.showModal();
  titleInput.focus();
}

function openEditDialog(task: Task): void {
  editingTaskId = task.id;
  titleInput.value = task.title;
  descriptionInput.value = task.description;
  prioritySelect.value = task.priority;
  dueDateInput.value = task.dueDate;
  descriptionCount.textContent = String(task.description.length);
  statusSelect.value = task.status;
  titleError.textContent = "";
  statusField.hidden = false;
  dialogEyebrow.textContent = "UPDATE THE DETAILS";
  dialogTitle.textContent = "Edit Task";
  saveButton.textContent = "Save Changes";
  taskDialog.showModal();
  titleInput.focus();
}

function openDeleteDialog(task: Task): void {
  deletingTaskId = task.id;
  confirmTaskTitle.textContent = `"${task.title}"`;
  confirmDialog.showModal();
  cancelDeleteButton.focus();
}

function closeDeleteDialog(): void {
  deletingTaskId = null;
  confirmDialog.close();
}

getElement<HTMLButtonElement>("add-task-button").addEventListener("click", openNewDialog);
getElement<HTMLButtonElement>("close-dialog-button").addEventListener("click", () => taskDialog.close());
getElement<HTMLButtonElement>("cancel-dialog-button").addEventListener("click", () => taskDialog.close());
taskDialog.addEventListener("close", () => {
  editingTaskId = null;
});

cancelDeleteButton.addEventListener("click", closeDeleteDialog);

confirmDeleteButton.addEventListener("click", () => {
  if (deletingTaskId !== null) {
    tasks = tasks.filter((savedTask) => savedTask.id !== deletingTaskId);
    saveAndRender();
  }
  closeDeleteDialog();
});

confirmDialog.addEventListener("close", () => {
  deletingTaskId = null;
});

confirmDialog.addEventListener("click", (event: MouseEvent) => {
  const rect = confirmDialog.getBoundingClientRect();
  const isInDialog =
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom;
  if (!isInDialog) {
    closeDeleteDialog();
  }
});

taskDialog.addEventListener("click", (event: MouseEvent) => {
  const rect = taskDialog.getBoundingClientRect();
  const isInDialog =
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom;
  if (!isInDialog) {
    taskDialog.close();
  }
});

titleInput.addEventListener("input", () => {
  titleError.textContent = "";
});

descriptionInput.addEventListener("input", () => {
  descriptionCount.textContent = String(descriptionInput.value.length);
});

taskForm.addEventListener("submit", (event: SubmitEvent) => {
  event.preventDefault();
  const title = titleInput.value.trim();
  if (title.length === 0) {
    titleError.textContent = "A task title is required.";
    titleInput.focus();
    return;
  }

  if (editingTaskId === null) {
    const newTask: Task = {
      id: createTaskId(tasks),
      title,
      description: descriptionInput.value.trim(),
      status: "todo",
      priority: prioritySelect.value as TaskPriority,
      dueDate: dueDateInput.value,
      createdAt: new Date().toISOString(),
    };
    tasks = [...tasks, newTask];
  } else {
    tasks = tasks.map((task) =>
      task.id === editingTaskId
        ? {
            ...task,
            title,
            description: descriptionInput.value.trim(),
            status: statusSelect.value as TaskStatus,
            priority: prioritySelect.value as TaskPriority,
            dueDate: dueDateInput.value,
          }
        : task,
    );
  }

  saveAndRender();
  taskDialog.close();
});

renderTasks();

renderTasks();