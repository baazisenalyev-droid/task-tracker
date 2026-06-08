// ==================== TASK TRACKER - JavaScript ====================

// Tailwind dark mode initialization
function initializeTailwind() {
    if (localStorage.getItem('darkMode') === 'true' || 
        (!localStorage.getItem('darkMode') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        updateDarkIcon(true);
    }
}

function updateDarkIcon(isDark) {
    const icon = document.getElementById('dark-icon');
    if (!icon) return;
    
    if (isDark) {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    }
}

function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('darkMode', isDark);
    updateDarkIcon(isDark);
}

// ==================== STATE ====================
let tasks = [];
let currentFilter = 'all';
let searchTerm = '';
let editingTaskId = null;
let draggedTaskId = null;

// ==================== DATA PERSISTENCE ====================
function loadTasks() {
    const saved = localStorage.getItem('tasks');
    if (saved) {
        tasks = JSON.parse(saved);
    } else {
        // Demo tasks for first launch
        const today = new Date();
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date(today); nextWeek.setDate(nextWeek.getDate() + 7);

        tasks = [
            {
                id: Date.now(),
                text: "Подготовить презентацию для встречи с клиентом",
                completed: false,
                dueDate: tomorrow.toISOString().split('T')[0],
                priority: "high",
                tags: ["работа", "важное"],
                createdAt: new Date().toISOString()
            },
            {
                id: Date.now() + 1,
                text: "Купить продукты на неделю",
                completed: true,
                dueDate: today.toISOString().split('T')[0],
                priority: "medium",
                tags: ["личное", "покупки"],
                createdAt: new Date(Date.now() - 86400000).toISOString()
            },
            {
                id: Date.now() + 2,
                text: "Записаться к врачу на профилактический осмотр",
                completed: false,
                dueDate: nextWeek.toISOString().split('T')[0],
                priority: "low",
                tags: ["здоровье"],
                createdAt: new Date(Date.now() - 172800000).toISOString()
            }
        ];
        saveTasks();
    }
}

function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

// ==================== HELPERS ====================
function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function isOverdue(task) {
    if (!task.dueDate || task.completed) return false;
    const due = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
}

function getPriorityInfo(priority) {
    switch(priority) {
        case 'high': return { label: 'Высокий', color: 'rose', icon: 'fa-arrow-up' };
        case 'medium': return { label: 'Средний', color: 'amber', icon: 'fa-equals' };
        case 'low': return { label: 'Низкий', color: 'emerald', icon: 'fa-arrow-down' };
        default: return { label: 'Средний', color: 'amber', icon: 'fa-equals' };
    }
}

function parseTags(tagsStr) {
    if (!tagsStr || !tagsStr.trim()) return [];
    return tagsStr.split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);
}

// ==================== RENDER ====================
function renderTasks() {
    const taskListEl = document.getElementById('task-list');
    const emptyState = document.getElementById('empty-state');
    
    if (!taskListEl || !emptyState) return;
    
    taskListEl.innerHTML = '';

    // Filter tasks
    let filtered = tasks.filter(task => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = task.text.toLowerCase().includes(searchLower) || 
                             (task.tags && task.tags.some(tag => tag.toLowerCase().includes(searchLower)));
        
        if (currentFilter === 'active') return !task.completed && matchesSearch;
        if (currentFilter === 'completed') return task.completed && matchesSearch;
        return matchesSearch;
    });

    // Smart sorting
    filtered.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        
        const prio = { high: 3, medium: 2, low: 1 };
        if (prio[a.priority] !== prio[b.priority]) return prio[b.priority] - prio[a.priority];
        
        if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    updateCounts();
    updateProgress();

    if (filtered.length === 0) {
        emptyState.style.display = 'flex';
        return;
    } else {
        emptyState.style.display = 'none';
    }

    // Render each task
    filtered.forEach(task => {
        const prio = getPriorityInfo(task.priority);
        const overdue = isOverdue(task);
        
        const tagsHTML = task.tags && task.tags.length > 0 
            ? task.tags.map(tag => 
                `<span class="tag-pill bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">${tag}</span>`
              ).join('') 
            : '';

        const taskEl = document.createElement('div');
        taskEl.className = `task-card task-item bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 group`;
        taskEl.setAttribute('draggable', 'true');
        taskEl.dataset.id = task.id;

        taskEl.innerHTML = `
            <div class="flex items-start sm:items-center gap-4 flex-1 min-w-0">
                <!-- Drag Handle -->
                <div class="drag-handle pt-1 text-zinc-300 dark:text-zinc-600 hover:text-zinc-400 hidden sm:block" title="Перетаскивать">
                    <i class="fa-solid fa-grip-vertical text-lg"></i>
                </div>
                
                <!-- Checkbox -->
                <div class="pt-0.5">
                    <input type="checkbox" class="w-5 h-5 accent-indigo-600 cursor-pointer" 
                           ${task.completed ? 'checked' : ''} 
                           onchange="toggleComplete(${task.id})">
                </div>
                
                <!-- Content -->
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-x-3 flex-wrap">
                        <span onclick="startEditTask(${task.id})" 
                              class="task-text text-[15px] font-medium text-zinc-800 dark:text-zinc-100 cursor-pointer hover:text-indigo-600 transition-colors break-words">
                            ${task.text}
                        </span>
                        
                        <span class="priority-badge inline-flex items-center gap-1 bg-${prio.color}-100 dark:bg-${prio.color}-900/60 text-${prio.color}-700 dark:text-${prio.color}-300">
                            <i class="fa-solid ${prio.icon} text-xs"></i>
                            <span>${prio.label}</span>
                        </span>
                    </div>
                    
                    <!-- Tags -->
                    ${tagsHTML ? `<div class="flex flex-wrap gap-1.5 mt-2">${tagsHTML}</div>` : ''}
                    
                    <!-- Due date -->
                    ${task.dueDate ? `
                        <div class="flex items-center gap-x-1.5 mt-1.5">
                            <div class="flex items-center text-xs ${overdue ? 'text-red-500 font-medium' : 'text-zinc-500 dark:text-zinc-400'}">
                                <i class="fa-regular fa-calendar mr-1.5"></i>
                                <span>${formatDate(task.dueDate)}</span>
                                ${overdue ? `<span class="ml-1.5 font-semibold">• просрочено</span>` : ''}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <!-- Actions -->
            <div class="flex items-center gap-x-1 sm:gap-x-2 ml-9 sm:ml-0">
                <button onclick="startEditTask(${task.id}); event.stopImmediatePropagation();" 
                        class="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-2xl transition-all opacity-70 group-hover:opacity-100"
                        title="Редактировать">
                    <i class="fa-solid fa-pen text-base"></i>
                </button>
                <button onclick="deleteTask(${task.id}); event.stopImmediatePropagation();" 
                        class="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-2xl transition-all opacity-70 group-hover:opacity-100"
                        title="Удалить">
                    <i class="fa-solid fa-trash text-base"></i>
                </button>
            </div>
        `;

        // Drag and Drop events
        taskEl.addEventListener('dragstart', (e) => {
            draggedTaskId = task.id;
            taskEl.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        taskEl.addEventListener('dragend', () => {
            taskEl.classList.remove('dragging');
            draggedTaskId = null;
        });

        taskEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        taskEl.addEventListener('drop', (e) => {
            e.preventDefault();
            if (draggedTaskId === null || draggedTaskId === task.id) return;

            const draggedIndex = tasks.findIndex(t => t.id === draggedTaskId);
            const targetIndex = tasks.findIndex(t => t.id === task.id);

            if (draggedIndex === -1 || targetIndex === -1) return;

            const [moved] = tasks.splice(draggedIndex, 1);
            tasks.splice(targetIndex, 0, moved);

            saveTasks();
            renderTasks();
        });

        taskListEl.appendChild(taskEl);
    });
}

// ==================== UI UPDATES ====================
function updateCounts() {
    const all = tasks.length;
    const active = tasks.filter(t => !t.completed).length;
    const completed = tasks.filter(t => t.completed).length;

    const countAll = document.getElementById('count-all');
    const countActive = document.getElementById('count-active');
    const countCompleted = document.getElementById('count-completed');

    if (countAll) countAll.textContent = all;
    if (countActive) countActive.textContent = active;
    if (countCompleted) countCompleted.textContent = completed;
}

function updateProgress() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    if (progressBar) progressBar.style.width = `${percent}%`;
    if (progressText) progressText.textContent = `${completed}/${total}`;
}

// ==================== FILTER ====================
function setFilter(filter) {
    currentFilter = filter;

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-indigo-600', 'text-white');
        btn.classList.add('text-zinc-600', 'dark:text-zinc-300');
    });

    let activeBtn = document.getElementById('filter-all');
    if (filter === 'active') activeBtn = document.getElementById('filter-active');
    if (filter === 'completed') activeBtn = document.getElementById('filter-completed');

    if (activeBtn) {
        activeBtn.classList.add('active', 'bg-indigo-600', 'text-white');
        activeBtn.classList.remove('text-zinc-600', 'dark:text-zinc-300');
    }

    renderTasks();
}

// ==================== TASK ACTIONS ====================
function addTask(text, dueDate, priority, tagsStr) {
    const newTask = {
        id: Date.now(),
        text: text.trim(),
        completed: false,
        dueDate: dueDate || null,
        priority: priority,
        tags: parseTags(tagsStr),
        createdAt: new Date().toISOString()
    };

    tasks.unshift(newTask);
    saveTasks();
    renderTasks();
    showToast('Задача добавлена!');
}

function toggleComplete(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    task.completed = !task.completed;
    saveTasks();
    renderTasks();

    if (task.completed) {
        showToast('Отличная работа! 🎉');
    }
}

function deleteTask(id) {
    if (!confirm('Удалить эту задачу?')) return;
    
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderTasks();
    showToast('Задача удалена');
}

function clearCompleted() {
    const count = tasks.filter(t => t.completed).length;
    if (count === 0) return;
    
    if (!confirm(`Удалить ${count} выполненных задач?`)) return;

    tasks = tasks.filter(t => !t.completed);
    saveTasks();
    renderTasks();
    showToast('Выполненные задачи очищены');
}

// ==================== EDIT MODAL ====================
function startEditTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    editingTaskId = id;

    const editText = document.getElementById('edit-text');
    const editDue = document.getElementById('edit-due-date');
    const editPriority = document.getElementById('edit-priority');
    const editTags = document.getElementById('edit-tags');
    const modal = document.getElementById('edit-modal');

    if (!editText || !editDue || !editPriority || !editTags || !modal) return;

    editText.value = task.text;
    editDue.value = task.dueDate || '';
    editPriority.value = task.priority;
    editTags.value = task.tags ? task.tags.join(', ') : '';

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    setTimeout(() => {
        editText.focus();
        editText.select();
    }, 120);
}

function closeEditModal() {
    const modal = document.getElementById('edit-modal');
    if (modal) {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }
    editingTaskId = null;
}

function saveEditedTask() {
    if (!editingTaskId) return;

    const idx = tasks.findIndex(t => t.id === editingTaskId);
    if (idx === -1) return;

    const newText = document.getElementById('edit-text').value.trim();
    if (!newText) {
        alert('Описание не может быть пустым!');
        return;
    }

    tasks[idx].text = newText;
    tasks[idx].dueDate = document.getElementById('edit-due-date').value || null;
    tasks[idx].priority = document.getElementById('edit-priority').value;
    tasks[idx].tags = parseTags(document.getElementById('edit-tags').value);

    saveTasks();
    closeEditModal();
    renderTasks();
    showToast('Изменения сохранены');
}

// ==================== EXPORT / IMPORT ====================
function exportTasks() {
    const dataStr = JSON.stringify(tasks, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `tasks_backup_${new Date().toISOString().slice(0,10)}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    showToast('Задачи экспортированы в JSON');
}

function importTasks(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            
            if (!Array.isArray(imported)) {
                alert('Неверный формат файла');
                return;
            }

            if (confirm(`Импортировать ${imported.length} задач? Текущие задачи будут заменены.`)) {
                tasks = imported;
                saveTasks();
                renderTasks();
                showToast('Задачи успешно импортированы!');
            }
        } catch (err) {
            alert('Ошибка при чтении файла JSON');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ==================== TOAST ====================
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-6 py-3 rounded-2xl shadow-xl flex items-center gap-x-3 text-sm font-medium z-[200]`;
    toast.innerHTML = `<span>${message}</span>`;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.transition = 'all 0.3s ease';
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 200);
    }, 2300);
}

// ==================== INITIALIZATION ====================
function initializeApp() {
    initializeTailwind();
    loadTasks();

    // Render tasks
    renderTasks();

    // Add Task Form
    const addForm = document.getElementById('add-task-form');
    if (addForm) {
        addForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const textInput = document.getElementById('task-text');
            const dueInput = document.getElementById('task-due-date');
            const prioSelect = document.getElementById('task-priority');
            const tagsInput = document.getElementById('task-tags');

            const text = textInput.value.trim();
            if (!text) return;

            addTask(text, dueInput.value, prioSelect.value, tagsInput.value);

            // Reset form
            textInput.value = '';
            dueInput.value = '';
            prioSelect.value = 'medium';
            tagsInput.value = '';
            textInput.focus();
        });
    }

    // Live Search
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            searchTerm = searchInput.value;
            renderTasks();
        });
    }

    // Keyboard Shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.key === '/' && document.activeElement.tagName === 'BODY') {
            e.preventDefault();
            if (searchInput) searchInput.focus();
        }
        
        if (e.key === 'Escape') {
            const modal = document.getElementById('edit-modal');
            if (modal && !modal.classList.contains('hidden')) {
                closeEditModal();
            } else if (searchInput) {
                searchInput.value = '';
                searchTerm = '';
                renderTasks();
            }
        }
    });

    // Set initial active filter style
    const filterAll = document.getElementById('filter-all');
    if (filterAll) {
        filterAll.classList.add('active', 'bg-indigo-600', 'text-white');
    }

    // Console hint
    console.log('%c[Task Tracker] Горячие клавиши: "/" — поиск • Esc — закрыть модалку / очистить поиск • Drag & Drop работает на десктопе', 'color:#64748b');
}

// Boot the application
window.onload = initializeApp;