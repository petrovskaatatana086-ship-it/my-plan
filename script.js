const storageKey = "minimal-goal-tasks-v4";
const legacyStorageKeys = ["minimal-goal-tasks-v3", "minimal-goal-tasks-v2", "minimal-goal-tasks-v1"];

const timeOptions = [
  ["morning", "Утро"],
  ["day", "День"],
  ["evening", "Вечер"],
];

const defaultGoals = ["Обучение", "Работа", "Здоровье", "Спорт", "Дети", "Финансы", "Проекты"];

const defaultCategories = [
  ["study-courses", "Курсы", "Обучение"],
  ["study-languages", "Языки", "Обучение"],
  ["study-literature", "Литература", "Обучение"],
  ["study-certification", "Сертификация", "Обучение"],
  ["work-meetings", "Встречи", "Работа"],
  ["work-documents", "Документы", "Работа"],
  ["work-communication", "Коммуникация", "Работа"],
  ["work-routine", "Рутина", "Работа"],
  ["health-checkups", "Чекапы", "Здоровье"],
  ["health-sleep", "Сон", "Здоровье"],
  ["health-food", "Питание", "Здоровье"],
  ["health-mental", "Ментал", "Здоровье"],
  ["sport-training", "Тренировки", "Спорт"],
  ["sport-activity", "Активность", "Спорт"],
  ["sport-equipment", "Инвентарь", "Спорт"],
  ["sport-goals", "Цели", "Спорт"],
  ["kids-clubs", "Кружки", "Дети"],
  ["kids-health", "Здоровье", "Дети"],
  ["kids-time", "Время вместе", "Дети"],
  ["kids-school", "Школа", "Дети"],
  ["finance-tracking", "Учёт", "Финансы"],
  ["finance-savings", "Накопления", "Финансы"],
  ["finance-investments", "Инвестиции", "Финансы"],
  ["finance-payments", "Платежи", "Финансы"],
  ["project-ideas", "Идеи", "Проекты"],
  ["project-active", "Активные", "Проекты"],
  ["project-waiting", "Ожидание", "Проекты"],
  ["project-archive", "Архив", "Проекты"],
];

const importanceLabels = { high: "Важно", medium: "Средне", low: "Низко" };
const urgencyLabels = { urgent: "Срочно", normal: "Обычно", later: "Позже" };

const form = document.querySelector("#taskForm");
const taskDetails = document.querySelector("#taskDetails");
const goalForm = document.querySelector("#goalForm");
const categoryForm = document.querySelector("#categoryForm");
const titleInput = document.querySelector("#titleInput");
const goalInput = document.querySelector("#goalInput");
const newGoalInput = document.querySelector("#newGoalInput");
const timeInput = document.querySelector("#timeInput");
const categoryInput = document.querySelector("#categoryInput");
const categoryGoalInput = document.querySelector("#categoryGoalInput");
const newCategoryInput = document.querySelector("#newCategoryInput");
const scheduleInput = document.querySelector("#scheduleInput");
const laterDateField = document.querySelector("#laterDateField");
const laterDateInput = document.querySelector("#laterDateInput");
const importanceInput = document.querySelector("#importanceInput");
const urgencyInput = document.querySelector("#urgencyInput");
const delegateInput = document.querySelector("#delegateInput");
const subtaskFields = document.querySelector("#subtaskFields");
const addSubtaskButton = document.querySelector("#addSubtaskButton");
const submitButton = document.querySelector("#submitButton");
const editActions = document.querySelector("#editActions");
const cancelEditButton = document.querySelector("#cancelEditButton");
const timeFilters = document.querySelector("#timeFilters");
const categoryFilter = document.querySelector("#categoryFilter");
const goalFilter = document.querySelector("#goalFilter");
const statusFilter = document.querySelector("#statusFilter");
const goalManager = document.querySelector("#goalManager");
const categoryManager = document.querySelector("#categoryManager");
const goalBoard = document.querySelector("#goalBoard");
const weekDays = document.querySelector("#weekDays");
const selectedDayTitle = document.querySelector("#selectedDayTitle");
const selectedDayMeta = document.querySelector("#selectedDayMeta");
const selectedDayTasks = document.querySelector("#selectedDayTasks");
const weekOverview = document.querySelector("#weekOverview");
const archiveBoard = document.querySelector("#archiveBoard");
const clearArchiveButton = document.querySelector("#clearArchiveButton");
const taskTemplate = document.querySelector("#taskTemplate");
const doneCount = document.querySelector("#doneCount");
const activeCount = document.querySelector("#activeCount");
const urgentCount = document.querySelector("#urgentCount");

const state = loadState();
const filters = {
  times: new Set(timeOptions.map(([value]) => value)),
  category: "all",
  goal: "all",
  status: "all",
};

let editingTaskId = "";
let selectedDayKey = toDateKey(new Date());

renderSubtaskInputs([""]);
setDefaultSchedule();
render();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = titleInput.value.trim();
  if (!title) return;

  const taskData = {
    title,
    goal: goalInput.value || state.goals[0],
    time: timeInput.value,
    category: categoryInput.value || getCategoriesForGoal(goalInput.value)[0]?.id || "",
    deadline: getSelectedScheduleDate(),
    importance: importanceInput.value,
    urgency: urgencyInput.value,
    delegateTo: delegateInput.value.trim(),
    subtasks: collectSubtasks(),
    done: editingTaskId ? Boolean(state.tasks.find((task) => task.id === editingTaskId)?.done) : false,
  };

  if (editingTaskId) {
    state.tasks = state.tasks.map((task) => (task.id === editingTaskId ? { ...task, ...taskData } : task));
  } else {
    state.tasks = [{ id: crypto.randomUUID(), ...taskData }, ...state.tasks];
  }

  saveState();
  resetTaskForm();
  render();
});

goalInput.addEventListener("change", () => {
  renderCategoryOptions(categoryInput, goalInput.value, false);
});

scheduleInput.addEventListener("change", syncLaterDateField);

goalFilter.addEventListener("change", () => {
  filters.goal = goalFilter.value;
  filters.category = "all";
  render();
});

categoryFilter.addEventListener("change", () => {
  filters.category = categoryFilter.value;
  renderActiveTasks();
});

statusFilter.addEventListener("change", () => {
  filters.status = statusFilter.value;
  renderActiveTasks();
});

goalForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addGoal(newGoalInput.value);
  newGoalInput.value = "";
});

categoryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addCategory(newCategoryInput.value, categoryGoalInput.value);
  newCategoryInput.value = "";
});

addSubtaskButton.addEventListener("click", () => addSubtaskInput(""));
cancelEditButton.addEventListener("click", () => {
  resetTaskForm();
  render();
});

clearArchiveButton.addEventListener("click", () => {
  state.archive = [];
  saveState();
  render();
});

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (saved) {
    try {
      return normalizeState(JSON.parse(saved));
    } catch {
      localStorage.removeItem(storageKey);
    }
  }

  for (const key of legacyStorageKeys) {
    const legacy = localStorage.getItem(key);
    if (!legacy) continue;
    try {
      const parsed = JSON.parse(legacy);
      return normalizeState(Array.isArray(parsed) ? { tasks: parsed, archive: [], goals: [], categories: [] } : parsed);
    } catch {
      localStorage.removeItem(key);
    }
  }

  return normalizeState({
    tasks: createDemoTasks(),
    archive: [],
    goals: defaultGoals,
    categories: defaultCategories,
  });
}

function normalizeState(rawState) {
  const tasks = Array.isArray(rawState.tasks) ? rawState.tasks : [];
  const archive = Array.isArray(rawState.archive) ? rawState.archive : [];
  const taskGoals = [...tasks, ...archive].map((task) => mapLegacyGoal(task.goal)).filter(Boolean);
  const goals = uniqueList([...(rawState.goals || []).map(mapLegacyGoal), ...defaultGoals, ...taskGoals]);
  const categories = normalizeCategories(rawState.categories, goals, tasks, archive);

  return {
    tasks: tasks.map((task) => normalizeTask(task, goals, categories)),
    archive: archive.map((task) => ({ ...normalizeTask(task, goals, categories), done: true })),
    goals,
    categories,
  };
}

function normalizeTask(task, goals, categories) {
  const goal = goals.includes(mapLegacyGoal(task.goal)) ? mapLegacyGoal(task.goal) : goals[0];
  const categoryIds = categories.map(({ id }) => id);
  const category = categoryIds.includes(task.category) && categories.find((item) => item.id === task.category)?.goal === goal
    ? task.category
    : getCategoriesForGoalFromList(goal, categories)[0]?.id || "";

  return {
    id: task.id || crypto.randomUUID(),
    title: task.title || "Новая задача",
    goal,
    time: timeOptions.some(([id]) => id === task.time) ? task.time : "day",
    category,
    deadline: task.deadline || getDateTimeOffset(1, 18),
    importance: importanceLabels[task.importance] ? task.importance : "medium",
    urgency: urgencyLabels[task.urgency] ? task.urgency : "normal",
    delegateTo: task.delegateTo || "",
    subtasks: normalizeSubtasks(task.subtasks),
    done: Boolean(task.done),
    completedAt: task.completedAt || "",
  };
}

function normalizeSubtasks(subtasks) {
  if (!Array.isArray(subtasks)) return [];
  return subtasks
    .map((subtask) => (typeof subtask === "string" ? { text: subtask, done: false } : { text: subtask.text || "", done: Boolean(subtask.done) }))
    .filter((subtask) => subtask.text.trim());
}

function normalizeCategories(rawCategories, goals, tasks, archive) {
  const categories = new Map(defaultCategories.map(([id, label, goal]) => [id, { id, label, goal }]));

  if (Array.isArray(rawCategories)) {
    rawCategories.forEach((category) => {
      if (Array.isArray(category)) {
        const goal = mapLegacyGoal(category[2] || goals[0]);
        categories.set(category[0], { id: category[0], label: category[1], goal: goals.includes(goal) ? goal : goals[0] });
      }
      if (category && category.id && category.label) {
        const goal = mapLegacyGoal(category.goal || category.group || goals[0]);
        categories.set(category.id, { id: category.id, label: category.label, goal: goals.includes(goal) ? goal : goals[0] });
      }
    });
  }

  [...tasks, ...archive].forEach((task) => {
    if (task.category && !categories.has(task.category)) {
      const goal = goals.includes(mapLegacyGoal(task.goal)) ? mapLegacyGoal(task.goal) : goals[0];
      categories.set(task.category, { id: task.category, label: task.category, goal });
    }
  });

  return [...categories.values()];
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function createDemoTasks() {
  return [
    {
      id: crypto.randomUUID(),
      title: "Подготовить план запуска",
      goal: "Проекты",
      time: "morning",
      category: "project-active",
      deadline: getDateTimeOffset(1, 10),
      importance: "high",
      urgency: "urgent",
      delegateTo: "",
      subtasks: [{ text: "Собрать вводные", done: false }],
      done: false,
    },
  ];
}

function render() {
  syncTaskControls();
  renderManagers();
  renderFilterButtons();
  updateSummary();
  renderWeekPlanner();
  renderActiveTasks();
  renderArchive();
}

function syncTaskControls() {
  const currentGoal = state.goals.includes(goalInput.value) ? goalInput.value : state.goals[0];
  const currentCategory = categoryInput.value;

  goalInput.innerHTML = "";
  goalFilter.innerHTML = `<option value="all">Все цели</option>`;
  categoryGoalInput.innerHTML = "";

  state.goals.forEach((goal) => {
    goalInput.append(new Option(goal, goal));
    goalFilter.append(new Option(goal, goal));
    categoryGoalInput.append(new Option(goal, goal));
  });

  goalInput.value = currentGoal;
  categoryGoalInput.value = currentGoal;
  renderCategoryOptions(categoryInput, goalInput.value, false);

  if (getCategoriesForGoal(goalInput.value).some(({ id }) => id === currentCategory)) {
    categoryInput.value = currentCategory;
  }

  filters.goal = state.goals.includes(filters.goal) ? filters.goal : "all";
  renderCategoryOptions(categoryFilter, filters.goal, true);
  filters.category = categoryFilter.querySelector(`option[value="${CSS.escape(filters.category)}"]`) ? filters.category : "all";
  categoryFilter.value = filters.category;
  goalFilter.value = filters.goal;
  statusFilter.value = filters.status;
}

function renderCategoryOptions(select, goal, includeAll) {
  const categories = goal === "all" ? state.categories : getCategoriesForGoal(goal);
  select.innerHTML = includeAll ? `<option value="all">Все подкатегории</option>` : "";

  if (goal === "all" && includeAll) {
    state.goals.forEach((goalName) => {
      const goalCategories = getCategoriesForGoal(goalName);
      if (!goalCategories.length) return;
      const group = document.createElement("optgroup");
      group.label = goalName;
      goalCategories.forEach(({ id, label }) => group.append(new Option(label, id)));
      select.append(group);
    });
  } else {
    categories.forEach(({ id, label }) => select.append(new Option(label, id)));
  }

  if (!includeAll && !categories.length) {
    const id = ensureDefaultCategoryForGoal(goal);
    select.append(new Option("Другое", id));
  }
}

function ensureDefaultCategoryForGoal(goal) {
  const id = createCategoryId("Другое", goal);
  state.categories.push({ id, label: "Другое", goal });
  saveState();
  return id;
}

function getCategoriesForGoal(goal) {
  return getCategoriesForGoalFromList(goal, state.categories);
}

function getCategoriesForGoalFromList(goal, categories) {
  return categories.filter((category) => category.goal === goal);
}

function renderSubtaskInputs(values = [""]) {
  subtaskFields.innerHTML = "";
  (values.length ? values : [""]).forEach((value) => addSubtaskInput(typeof value === "string" ? value : value.text));
}

function addSubtaskInput(value) {
  const row = document.createElement("label");
  row.className = "subtask-field";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Подзадача";
  input.value = value || "";

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "remove-subtask-button";
  removeButton.textContent = "×";
  removeButton.setAttribute("aria-label", "Убрать подзадачу");
  removeButton.addEventListener("click", () => {
    row.remove();
    if (!subtaskFields.children.length) addSubtaskInput("");
  });

  row.append(input, removeButton);
  subtaskFields.append(row);
}

function collectSubtasks() {
  return [...subtaskFields.querySelectorAll("input")]
    .map((input) => input.value.trim())
    .filter(Boolean)
    .map((text) => ({ text, done: false }));
}

function renderManagers() {
  goalManager.innerHTML = "";
  categoryManager.innerHTML = "";

  state.goals.forEach((goal) => {
    goalManager.append(createEditableItem(goal, "Переименовать цель", "Удалить цель", (nextValue) => renameGoal(goal, nextValue), () => deleteGoal(goal)));
  });

  state.goals.forEach((goal) => {
    const group = document.createElement("div");
    group.className = "category-group";
    group.innerHTML = `<p>${escapeHtml(goal)}</p>`;
    getCategoriesForGoal(goal).forEach((category) => {
      group.append(createEditableItem(category.label, "Переименовать подкатегорию", "Удалить подкатегорию", (nextValue) => renameCategory(category.id, nextValue), () => deleteCategory(category.id)));
    });
    categoryManager.append(group);
  });
}

function createEditableItem(value, saveLabel, deleteLabel, onSave, onDelete) {
  const row = document.createElement("div");
  row.className = "editable-item";

  const input = document.createElement("input");
  input.value = value;
  input.type = "text";

  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.className = "mini-button";
  saveButton.textContent = "✓";
  saveButton.setAttribute("aria-label", saveLabel);
  saveButton.addEventListener("click", () => onSave(input.value));

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "mini-button danger";
  deleteButton.textContent = "×";
  deleteButton.setAttribute("aria-label", deleteLabel);
  deleteButton.addEventListener("click", onDelete);

  row.append(input, saveButton, deleteButton);
  return row;
}

function renderFilterButtons() {
  timeFilters.innerHTML = "";
  timeOptions.forEach(([value, label]) => {
    timeFilters.append(createFilterButton(label, value, filters.times, () => renderActiveTasks()));
  });
}

function createFilterButton(label, value, store, onChange) {
  const button = document.createElement("button");
  button.className = `chip ${store.has(value) ? "is-active" : ""}`;
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", () => {
    if (store.has(value) && store.size > 1) store.delete(value);
    else store.add(value);
    button.classList.toggle("is-active", store.has(value));
    onChange();
  });
  return button;
}

function renderWeekPlanner() {
  const days = getCurrentWeekDays();
  const dayKeys = days.map((date) => toDateKey(date));
  if (!dayKeys.includes(selectedDayKey)) selectedDayKey = dayKeys.includes(toDateKey(new Date())) ? toDateKey(new Date()) : dayKeys[0];

  weekDays.innerHTML = "";
  days.forEach((date) => {
    const key = toDateKey(date);
    const dayTasks = state.tasks.filter((task) => toDateKey(new Date(task.deadline)) === key);
    const planned = dayTasks.filter((task) => !task.done).length;

    const button = document.createElement("button");
    button.type = "button";
    button.className = `week-day ${key === selectedDayKey ? "is-selected" : ""}`;
    button.innerHTML = `<strong>${getShortWeekday(date)}</strong><span>${formatDayNumber(date)}</span><small>${planned} в плане</small>`;
    button.addEventListener("click", () => {
      selectedDayKey = key;
      renderWeekPlanner();
    });
    weekDays.append(button);
  });

  const selectedDate = days.find((date) => toDateKey(date) === selectedDayKey) || days[0];
  const tasksForDay = state.tasks
    .filter((task) => toDateKey(new Date(task.deadline)) === selectedDayKey)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  selectedDayTitle.textContent = getFullWeekday(selectedDate);
  selectedDayMeta.textContent = `${tasksForDay.filter((task) => !task.done).length} в плане / ${tasksForDay.filter((task) => task.done).length} готово`;
  selectedDayTasks.innerHTML = "";

  if (!tasksForDay.length) {
    selectedDayTasks.append(createEmptyState("На этот день пока нет задач. Добавьте первую выше."));
  } else {
    tasksForDay.forEach((task) => selectedDayTasks.append(createWeekTaskItem(task)));
  }

  renderWeekOverview(days);
}

function renderWeekOverview(days) {
  weekOverview.innerHTML = "";
  days.forEach((date) => {
    const key = toDateKey(date);
    const tasks = state.tasks.filter((task) => toDateKey(new Date(task.deadline)) === key);
    const planned = tasks.filter((task) => !task.done).length;
    const done = tasks.filter((task) => task.done).length;

    const item = document.createElement("button");
    item.type = "button";
    item.className = `week-overview-item ${key === selectedDayKey ? "is-selected" : ""}`;
    item.innerHTML = `
      <span>${getFullWeekday(date)}</span>
      <small>${planned} в плане / ${done} готово</small>
      <em>${tasks[0] ? escapeHtml(tasks[0].title) : "Пока ничего не запланировано"}</em>
    `;
    item.addEventListener("click", () => {
      selectedDayKey = key;
      renderWeekPlanner();
    });
    weekOverview.append(item);
  });

  const laterTasks = state.tasks
    .filter((task) => new Date(task.deadline) > endOfDay(days[days.length - 1]))
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 4);

  laterTasks.forEach((task) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "week-overview-item is-later";
    item.innerHTML = `
      <span>${formatDateNumber(task.deadline)}</span>
      <small>после недели</small>
      <em>${escapeHtml(task.title)}</em>
    `;
    item.addEventListener("click", () => startEditTask(task.id));
    weekOverview.append(item);
  });
}

function createWeekTaskItem(task) {
  const item = document.createElement("article");
  item.className = `day-task-item ${task.done ? "is-done" : ""}`;
  item.innerHTML = `
    <div>
      <strong>${escapeHtml(task.title)}</strong>
      <span>${formatDeadline(task.deadline)} · ${escapeHtml(getCategoryLabel(task.category))}</span>
    </div>
    <button type="button" aria-label="Редактировать задачу">✎</button>
  `;
  item.querySelector("button").addEventListener("click", () => startEditTask(task.id));
  return item;
}

function renderActiveTasks() {
  syncGoalControlsOnly();
  const visibleTasks = getVisibleTasks();
  goalBoard.innerHTML = "";

  if (!visibleTasks.length) {
    goalBoard.append(createEmptyState("Нет задач под выбранные фильтры"));
    return;
  }

  groupByGoal(visibleTasks).forEach(([goal, goalTasks]) => {
    const section = document.createElement("section");
    section.className = "goal-section";
    const header = document.createElement("header");
    header.className = "goal-header";
    header.innerHTML = `<h2>${escapeHtml(goal)}</h2><span class="goal-count">${goalTasks.length} задач</span>`;
    const stack = document.createElement("div");
    stack.className = "task-stack";
    goalTasks.forEach((task) => stack.append(renderTask(task, false)));
    section.append(header, stack);
    goalBoard.append(section);
  });
}

function renderArchive() {
  archiveBoard.innerHTML = "";
  clearArchiveButton.disabled = !state.archive.length;
  if (!state.archive.length) {
    archiveBoard.append(createEmptyState("Архив пока пуст"));
    return;
  }
  const stack = document.createElement("div");
  stack.className = "task-stack";
  state.archive.forEach((task) => stack.append(renderTask(task, true)));
  archiveBoard.append(stack);
}

function renderTask(task, archived) {
  const node = taskTemplate.content.firstElementChild.cloneNode(true);
  const checkbox = node.querySelector(".task-check input");
  const title = node.querySelector("h3");
  const meta = node.querySelector(".meta-row");
  const subtasks = node.querySelector(".subtask-list");
  const editButton = node.querySelector(".edit-button");
  const archiveButton = node.querySelector(".archive-button");
  const deleteButton = node.querySelector(".delete-button");

  node.classList.toggle("is-done", task.done || archived);
  checkbox.checked = task.done || archived;
  checkbox.disabled = archived || task.subtasks.length > 0;
  title.textContent = task.title;
  editButton.hidden = archived;
  archiveButton.hidden = archived;
  deleteButton.setAttribute("aria-label", archived ? "Удалить из архива" : "Удалить задачу");

  checkbox.addEventListener("change", () => toggleTaskDone(task.id));
  editButton.addEventListener("click", () => startEditTask(task.id));
  archiveButton.addEventListener("click", () => archiveTask(task.id));
  deleteButton.addEventListener("click", () => deleteTask(task.id, archived));

  [
    [getLabel(timeOptions, task.time), "time"],
    [getCategoryLabel(task.category), ""],
    [formatDeadline(task.deadline), task.urgency === "urgent" ? "urgent" : ""],
    [importanceLabels[task.importance], task.importance === "high" ? "important" : ""],
    [urgencyLabels[task.urgency], task.urgency === "urgent" ? "urgent" : ""],
    [task.delegateTo ? `Кому: ${task.delegateTo}` : "", ""],
    [archived && task.completedAt ? `Архив: ${formatDeadline(task.completedAt)}` : "", ""],
  ]
    .filter(([label]) => label)
    .forEach(([label, tone]) => {
      const tag = document.createElement("span");
      tag.className = `tag ${tone}`.trim();
      tag.textContent = label;
      meta.append(tag);
    });

  task.subtasks.forEach((subtask, index) => subtasks.append(renderSubtask(task.id, subtask, index, archived)));
  return node;
}

function renderSubtask(taskId, subtask, index, archived) {
  const label = document.createElement("label");
  label.className = "subtask-check";
  label.classList.toggle("is-subtask-done", subtask.done);
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = subtask.done;
  input.disabled = archived;
  input.addEventListener("change", () => toggleSubtask(taskId, index));
  const text = document.createElement("span");
  text.textContent = subtask.text;
  label.append(input, text);
  return label;
}

function toggleSubtask(taskId, subtaskIndex) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;
  task.subtasks = task.subtasks.map((subtask, index) => (index === subtaskIndex ? { ...subtask, done: !subtask.done } : subtask));
  task.done = task.subtasks.length > 0 && task.subtasks.every((subtask) => subtask.done);
  saveState();
  render();
}

function toggleTaskDone(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;
  if (task.subtasks.length) return;
  task.done = !task.done;
  saveState();
  render();
}

function startEditTask(id) {
  const task = state.tasks.find((item) => item.id === id);
  if (!task) return;
  editingTaskId = id;
  titleInput.value = task.title;
  goalInput.value = task.goal;
  renderCategoryOptions(categoryInput, task.goal, false);
  timeInput.value = task.time;
  categoryInput.value = task.category;
  setScheduleFromDate(task.deadline);
  importanceInput.value = task.importance;
  urgencyInput.value = task.urgency;
  delegateInput.value = task.delegateTo;
  renderSubtaskInputs(task.subtasks);
  submitButton.textContent = "Сохранить";
  editActions.hidden = false;
  taskDetails.open = true;
  titleInput.focus();
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetTaskForm() {
  editingTaskId = "";
  form.reset();
  renderSubtaskInputs([""]);
  setDefaultSchedule();
  submitButton.textContent = "Добавить";
  editActions.hidden = true;
  taskDetails.open = false;
  titleInput.focus();
}

function archiveTask(id) {
  const task = state.tasks.find((item) => item.id === id);
  if (!task) return;
  if (editingTaskId === id) resetTaskForm();
  state.tasks = state.tasks.filter((item) => item.id !== id);
  state.archive = [{ ...task, done: true, completedAt: toDateTimeLocal(new Date()) }, ...state.archive];
  saveState();
  render();
}

function deleteTask(id, archived) {
  if (editingTaskId === id) resetTaskForm();
  if (archived) state.archive = state.archive.filter((task) => task.id !== id);
  else state.tasks = state.tasks.filter((task) => task.id !== id);
  saveState();
  render();
}

function addGoal(value) {
  const goal = value.trim();
  if (!goal || state.goals.includes(goal)) return;
  state.goals.push(goal);
  saveState();
  render();
  goalInput.value = goal;
  categoryGoalInput.value = goal;
}

function renameGoal(oldValue, nextValue) {
  const goal = nextValue.trim();
  if (!goal) return;
  state.goals = state.goals.map((item) => (item === oldValue ? goal : item));
  state.categories = state.categories.map((category) => (category.goal === oldValue ? { ...category, goal } : category));
  state.tasks = state.tasks.map((task) => (task.goal === oldValue ? { ...task, goal } : task));
  state.archive = state.archive.map((task) => (task.goal === oldValue ? { ...task, goal } : task));
  saveState();
  render();
}

function deleteGoal(goal) {
  if (state.goals.length === 1) return;
  const fallback = state.goals.find((item) => item !== goal);
  const fallbackCategory = getCategoriesForGoalFromList(fallback, state.categories)[0]?.id || "";
  state.goals = state.goals.filter((item) => item !== goal);
  state.categories = state.categories.filter((category) => category.goal !== goal);
  state.tasks = state.tasks.map((task) => (task.goal === goal ? { ...task, goal: fallback, category: fallbackCategory } : task));
  state.archive = state.archive.map((task) => (task.goal === goal ? { ...task, goal: fallback, category: fallbackCategory } : task));
  if (filters.goal === goal) filters.goal = "all";
  saveState();
  render();
}

function addCategory(value, goal) {
  const label = value.trim();
  if (!label) return "";
  const targetGoal = state.goals.includes(goal) ? goal : state.goals[0];
  const exists = state.categories.some((category) => category.goal === targetGoal && category.label.toLowerCase() === label.toLowerCase());
  if (exists) return getCategoriesForGoal(targetGoal).find((category) => category.label.toLowerCase() === label.toLowerCase())?.id || "";
  const id = createCategoryId(label, targetGoal);
  state.categories.push({ id, label, goal: targetGoal });
  saveState();
  render();
  categoryInput.value = id;
  return id;
}

function renameCategory(id, nextValue) {
  const label = nextValue.trim();
  if (!label) return;
  state.categories = state.categories.map((category) => (category.id === id ? { ...category, label } : category));
  saveState();
  render();
}

function deleteCategory(id) {
  const category = state.categories.find((item) => item.id === id);
  if (!category) return;
  const fallback = getCategoriesForGoal(category.goal).find((item) => item.id !== id)?.id || addCategory("Другое", category.goal);
  state.categories = state.categories.filter((item) => item.id !== id);
  state.tasks = state.tasks.map((task) => (task.category === id ? { ...task, category: fallback } : task));
  state.archive = state.archive.map((task) => (task.category === id ? { ...task, category: fallback } : task));
  if (filters.category === id) filters.category = "all";
  saveState();
  render();
}

function getVisibleTasks() {
  return state.tasks.filter((task) => {
    const byTime = filters.times.has(task.time);
    const byCategory = filters.category === "all" || filters.category === task.category;
    const byGoal = filters.goal === "all" || task.goal === filters.goal;
    const byStatus =
      filters.status === "all" ||
      (filters.status === "active" && !task.done) ||
      (filters.status === "done" && task.done) ||
      (filters.status === "delegated" && task.delegateTo);
    return byTime && byCategory && byGoal && byStatus;
  });
}

function syncGoalControlsOnly() {
  filters.goal = state.goals.includes(filters.goal) ? filters.goal : "all";
  goalFilter.value = filters.goal;
  categoryFilter.value = filters.category;
  statusFilter.value = filters.status;
}

function groupByGoal(items) {
  const groups = new Map();
  items.forEach((task) => {
    if (!groups.has(task.goal)) groups.set(task.goal, []);
    groups.get(task.goal).push(task);
  });
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, "ru"));
}

function updateSummary() {
  doneCount.textContent = state.archive.length;
  activeCount.textContent = state.tasks.filter((task) => !task.done).length;
  urgentCount.textContent = state.tasks.filter((task) => task.urgency === "urgent" && !task.done).length;
}

function mapLegacyGoal(value) {
  const text = String(value || "").replace(/^[^\p{L}\p{N}]+ /u, "");
  const lower = text.toLowerCase();
  if (/обуч|курс|язык|литер|сертиф|рост/.test(lower)) return "Обучение";
  if (/работ|встреч|документ|коммуник|рутин/.test(lower)) return "Работа";
  if (/здоров|сон|питан|ментал|чекап/.test(lower)) return "Здоровье";
  if (/спорт|трен|актив|инвент/.test(lower)) return "Спорт";
  if (/дет|школ|круж/.test(lower)) return "Дети";
  if (/финанс|учёт|учет|деньг|плат|инвест|накоп/.test(lower)) return "Финансы";
  if (/проект|запуск|иде|ожидан|архив/.test(lower)) return "Проекты";
  return defaultGoals.includes(text) ? text : "Проекты";
}

function createEmptyState(text) {
  const empty = document.createElement("div");
  empty.className = "empty-state";
  empty.textContent = text;
  return empty;
}

function getCurrentWeekDays() {
  const today = startOfDay(new Date());
  const monday = new Date(today);
  const day = monday.getDay() || 7;
  monday.setDate(monday.getDate() - day + 1);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

function startOfDay(date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function endOfDay(date) {
  const nextDate = new Date(date);
  nextDate.setHours(23, 59, 59, 999);
  return nextDate;
}

function toDateKey(date) {
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getShortWeekday(date) {
  return new Intl.DateTimeFormat("ru", { weekday: "short" }).format(date);
}

function getFullWeekday(date) {
  const weekday = new Intl.DateTimeFormat("ru", { weekday: "long" }).format(date);
  return weekday.charAt(0).toUpperCase() + weekday.slice(1);
}

function formatDayNumber(date) {
  return new Intl.DateTimeFormat("ru", { day: "2-digit", month: "short" }).format(date);
}

function formatDateNumber(value) {
  return new Intl.DateTimeFormat("ru", { day: "2-digit", month: "2-digit" }).format(new Date(value));
}

function setDefaultSchedule() {
  scheduleInput.value = getWeekdayValue(new Date());
  laterDateInput.value = "";
  syncLaterDateField();
}

function syncLaterDateField() {
  const isLater = scheduleInput.value === "later";
  laterDateField.hidden = !isLater;
  laterDateInput.required = isLater;
  if (isLater && !laterDateInput.value) {
    laterDateInput.value = toDateInputValue(getDateOffset(8));
  }
}

function getSelectedScheduleDate() {
  if (scheduleInput.value === "later") {
    const date = laterDateInput.value ? new Date(`${laterDateInput.value}T18:00`) : getDateOffset(8);
    return toDateTimeLocal(date);
  }

  const date = getDateForWeekday(scheduleInput.value);
  date.setHours(18, 0, 0, 0);
  return toDateTimeLocal(date);
}

function setScheduleFromDate(value) {
  const date = new Date(value);
  const weekDays = getCurrentWeekDays();
  const key = toDateKey(date);
  const weekDay = weekDays.find((item) => toDateKey(item) === key);

  if (weekDay) {
    scheduleInput.value = getWeekdayValue(weekDay);
    laterDateInput.value = "";
  } else {
    scheduleInput.value = "later";
    laterDateInput.value = toDateInputValue(date);
  }

  syncLaterDateField();
}

function getDateForWeekday(value) {
  const index = weekdayOptions().indexOf(value);
  const days = getCurrentWeekDays();
  return new Date(days[Math.max(index, 0)]);
}

function getWeekdayValue(date) {
  return weekdayOptions()[(date.getDay() || 7) - 1];
}

function weekdayOptions() {
  return ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
}

function getDateOffset(daysAhead) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  date.setHours(18, 0, 0, 0);
  return date;
}

function toDateInputValue(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getDateTimeOffset(daysAhead, hour) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  date.setHours(hour, 0, 0, 0);
  return toDateTimeLocal(date);
}

function toDateTimeLocal(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDeadline(value) {
  if (!value) return "";
  const date = new Date(value);
  return new Intl.DateTimeFormat("ru", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getLabel(options, value) {
  return options.find(([key]) => key === value)?.[1] || value;
}

function getCategoryLabel(value) {
  const category = state.categories.find(({ id }) => id === value);
  return category ? `${category.goal}: ${category.label}` : value;
}

function createCategoryId(label, goal) {
  const base =
    `${goal}-${label}`
      .toLowerCase()
      .trim()
      .replace(/[^a-zа-яё0-9]+/gi, "-")
      .replace(/^-|-$/g, "") || "subcategory";
  let id = base;
  let index = 2;
  while (state.categories.some((category) => category.id === id)) {
    id = `${base}-${index}`;
    index += 1;
  }
  return id;
}

function uniqueList(items) {
  return [...new Set(items.map((item) => String(item).trim()).filter(Boolean))];
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return entities[char];
  });
}
