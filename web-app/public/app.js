const tasksContainer = document.querySelector('#tasks');
const taskTemplate = document.querySelector('#task-template');
const form = document.querySelector('#task-form');
const titleInput = document.querySelector('#task-title');
const descriptionInput = document.querySelector('#task-description');
const feedback = document.querySelector('.form-feedback');
const summaryList = document.querySelector('#summary');
const completionRateEl = document.querySelector('#completion-rate');
const refreshBtn = document.querySelector('#refresh-btn');

async function fetchTasks() {
  const response = await fetch('/api/tasks');
  if (!response.ok) {
    throw new Error('無法載入任務');
  }
  return response.json();
}

function renderTasks(tasks) {
  tasksContainer.innerHTML = '';

  if (tasks.length === 0) {
    const emptyMessage = document.createElement('li');
    emptyMessage.className = 'task-item';
    emptyMessage.innerHTML = '<p>目前沒有任務，為自己安排一個新挑戰吧！</p>';
    tasksContainer.appendChild(emptyMessage);
    renderInsights(tasks);
    return;
  }

  tasks.forEach((task) => {
    const node = taskTemplate.content.firstElementChild.cloneNode(true);
    const checkbox = node.querySelector('input[type="checkbox"]');
    const title = node.querySelector('h3');
    const description = node.querySelector('.task-description');
    const deleteBtn = node.querySelector('.delete-btn');

    title.textContent = task.title;
    description.textContent = task.description || '—';
    checkbox.checked = task.completed;

    if (task.completed) {
      node.classList.add('completed');
    }

    checkbox.addEventListener('change', async () => {
      await toggleTask(task.id);
      await refresh();
    });

    deleteBtn.addEventListener('click', async () => {
      const confirmed = confirm(`確定刪除「${task.title}」嗎？`);
      if (!confirmed) return;
      await deleteTask(task.id);
      await refresh();
    });

    node.addEventListener('contextmenu', async (event) => {
      event.preventDefault();
      const confirmed = confirm(`長按確認刪除「${task.title}」嗎？`);
      if (!confirmed) return;
      await deleteTask(task.id);
      await refresh();
    });

    tasksContainer.appendChild(node);
  });

  renderInsights(tasks);
}

function renderInsights(tasks) {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  const rate = total === 0 ? 0 : Math.round((completed / total) * 100);
  completionRateEl.textContent = `${rate}%`;

  summaryList.innerHTML = '';

  const summaryItems = [
    `本日共有 ${total} 個任務`,
    completed === total && total > 0
      ? '全部完成！可以為自己安排新的挑戰。'
      : `已完成 ${completed} 項，剩餘 ${total - completed} 項等待突破`
  ];

  summaryItems.forEach((text) => {
    const li = document.createElement('li');
    li.textContent = text;
    summaryList.appendChild(li);
  });
}

async function createTask(data) {
  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const { error } = await response.json();
    throw new Error(error || '新增任務失敗');
  }

  return response.json();
}

async function toggleTask(id) {
  const response = await fetch(`/api/tasks/${id}/toggle`, { method: 'PATCH' });
  if (!response.ok) {
    throw new Error('更新任務狀態失敗');
  }
  return response.json();
}

async function deleteTask(id) {
  const response = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    const { error } = await response.json();
    throw new Error(error || '刪除任務失敗');
  }
}

async function refresh() {
  try {
    const tasks = await fetchTasks();
    renderTasks(tasks);
  } catch (error) {
    feedback.textContent = error.message;
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();

  if (!title) {
    feedback.textContent = '請輸入任務標題';
    titleInput.focus();
    return;
  }

  try {
    feedback.textContent = '';
    form.querySelector('button[type="submit"]').disabled = true;
    await createTask({ title, description });
    titleInput.value = '';
    descriptionInput.value = '';
    await refresh();
    feedback.textContent = '任務已加入！';
    feedback.style.color = 'var(--success)';
  } catch (error) {
    feedback.textContent = error.message;
    feedback.style.color = 'var(--danger)';
  } finally {
    form.querySelector('button[type="submit"]').disabled = false;
  }
});

refreshBtn.addEventListener('click', () => {
  refresh();
});

refresh();
