'use strict';

// Обычный скрипт: работает даже при открытии index.html через file://.
const storageKey = 'tishe-tasks-v1';
const durations = { focus: 25 * 60, break: 5 * 60 };
let mode = 'focus';
let remaining = durations.focus;
let deadline = 0;
let interval = null;
let hasStarted = false;
const timer = document.querySelector('#timer');
const caption = document.querySelector('#timer-caption');
const start = document.querySelector('#start');
const playIcon = document.querySelector('#play-icon');
const list = document.querySelector('#task-list');
const input = document.querySelector('#task-input');
const storageStatus = document.querySelector('#storage-status');

function updateTimer() {
  const minutes = String(Math.floor(remaining / 60)).padStart(2, '0');
  const seconds = String(remaining % 60).padStart(2, '0');
  timer.textContent = `${minutes}:${seconds}`;
  document.title = hasStarted ? `${minutes}:${seconds} — ${mode === 'focus' ? 'Фокус' : 'Перерыв'} · Тише` : 'Тише — одно дело за раз';
  start.querySelector('span').textContent = interval !== null ? 'Пауза' : remaining === 0 ? 'Ещё раз' : hasStarted ? 'Продолжить' : 'Начать';
  playIcon.innerHTML = interval !== null ? '<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>' : '<path d="M8 4 20 12 8 20Z"/>';
}

function pauseTimer() {
  clearInterval(interval);
  interval = null;
}

function tick() {
  // Считаем по времени окончания, чтобы фоновые вкладки не замедляли таймер.
  remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  if (remaining === 0) {
    pauseTimer();
    caption.textContent = mode === 'focus' ? 'Отличная работа! Пора отдохнуть.' : 'Перерыв окончен. Начнём снова?';
  }
  updateTimer();
}

function resetTimer() {
  pauseTimer();
  remaining = durations[mode];
  hasStarted = false;
  caption.textContent = mode === 'focus' ? 'Время для самого важного' : 'Вдохните. Выдохните. Отдохните.';
  updateTimer();
}

start.addEventListener('click', () => {
  if (interval !== null) {
    tick();
    pauseTimer();
  } else {
    if (remaining === 0) resetTimer();
    hasStarted = true;
    deadline = Date.now() + remaining * 1000;
    interval = setInterval(tick, 250);
  }
  updateTimer();
});
document.querySelector('#reset').addEventListener('click', resetTimer);
document.querySelectorAll('.mode').forEach(button => {
  button.addEventListener('click', () => {
    if (button.dataset.mode === mode) return;
    mode = button.dataset.mode;
    document.querySelectorAll('.mode').forEach(item => {
      const selected = item.dataset.mode === mode;
      item.classList.toggle('active', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
    resetTimer();
  });
});
document.addEventListener('visibilitychange', () => { if (interval !== null) tick(); });

function storageUnavailable() {
  storageStatus.textContent = 'Сохранение недоступно: задачи останутся до закрытия страницы.';
}

function loadTasks() {
  const defaults = ['Выбрать главное на день', '25 минут без отвлечений', 'Сделать небольшой перерыв'].map(text => ({ text, done: false }));
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === null) return defaults;
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return defaults;
    return parsed.filter(task => task && typeof task.text === 'string' && task.text.trim() && typeof task.done === 'boolean').map(task => ({ text: task.text.slice(0, 160), done: task.done }));
  } catch {
    storageUnavailable();
    return defaults;
  }
}
let tasks = loadTasks();

function saveTasks() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(tasks));
    storageStatus.textContent = 'Задачи сохраняются в этом браузере.';
  } catch { storageUnavailable(); }
}

function renderTasks() {
  list.replaceChildren();
  tasks.forEach((task, index) => {
    const row = document.createElement('li');
    row.className = 'task';
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.done;
    const text = document.createElement('span');
    text.textContent = task.text;
    checkbox.addEventListener('change', () => {
      task.done = checkbox.checked;
      saveTasks();
      updateTaskCount();
    });
    label.append(checkbox, text);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'delete';
    remove.setAttribute('aria-label', `Удалить задачу: ${task.text}`);
    remove.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
    remove.addEventListener('click', () => {
      tasks.splice(index, 1);
      saveTasks();
      renderTasks();
      const nextCheckbox = list.children[Math.min(index, tasks.length - 1)]?.querySelector('input');
      (nextCheckbox || input).focus();
    });
    row.append(label, remove);
    list.append(row);
  });
  updateTaskCount();
}

function updateTaskCount() {
  document.querySelector('#task-count').textContent = `${tasks.filter(task => task.done).length} / ${tasks.length}`;
  document.querySelector('#empty').hidden = tasks.length > 0;
}

document.querySelector('#task-form').addEventListener('submit', event => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) { input.value = ''; input.focus(); return; }
  tasks.push({ text: text.slice(0, 160), done: false });
  saveTasks();
  renderTasks();
  input.value = '';
  input.focus();
});

renderTasks();
updateTimer();
