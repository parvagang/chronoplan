document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    let tasks = JSON.parse(localStorage.getItem('chronoPlan_tasks')) || [
        {
            id: '1',
            title: 'Welcome to ChronoPlan! 🚀',
            desc: 'Start organizing your schedule with style.',
            date: new Date().toISOString().split('T')[0],
            time: '09:00',
            list: 'Personal',
            completed: false,
            reminder: true
        },
        {
            id: '2',
            title: 'Design Team Meeting',
            desc: 'Discuss new glassmorphism UI updates.',
            date: new Date().toISOString().split('T')[0],
            time: '14:30',
            list: 'Work',
            completed: true,
            reminder: false
        }
    ];

    let lists = JSON.parse(localStorage.getItem('chronoPlan_lists')) || ['Work', 'Personal', 'Fitness', 'Shopping'];
    let currentFilter = 'all'; // all, today, upcoming
    let editingTaskId = null;
    let triggeredReminders = new Set();
    let currentAlarmTask = null;

    // --- DOM Elements ---
    const tasksContainer = document.getElementById('tasks-container');
    const listsContainer = document.getElementById('lists-container');
    const taskModal = document.getElementById('task-modal');
    const newTaskBtn = document.getElementById('new-task-btn');
    const closeModalBtns = document.querySelectorAll('.close-modal');
    const taskForm = document.getElementById('task-form');
    const taskListSelect = document.getElementById('task-list');
    const currentDateDisplay = document.getElementById('current-date-display');
    const currentViewTitle = document.getElementById('current-view-title');
    const searchInput = document.getElementById('task-search');
    const navItems = document.querySelectorAll('.nav-item');
    const settingsBtn = document.querySelector('.settings-icon');
    const settingsModal = document.getElementById('settings-modal');
    const loginModal = document.getElementById('login-modal');
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');
    const ringtoneSelect = document.getElementById('ringtone-select');
    const ringtonePlate = document.getElementById('ringtone-plate');
    const plateSoundName = document.getElementById('plate-sound-name');
    const plateStatus = document.getElementById('plate-status');
    const plateVolumeSlider = document.getElementById('plate-volume-slider');
    const plateVolumeValue = document.getElementById('plate-volume-value');
    const platePlayBtn = document.getElementById('plate-play-btn');
    const plateStopBtn = document.getElementById('plate-stop-btn');
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const userProfile = document.querySelector('.user-profile');

    // Alarm Modal Elements
    const reminderModal = document.getElementById('reminder-modal');
    const snoozeBtn = document.getElementById('snooze-btn');
    const stopAlarmBtn = document.getElementById('stop-alarm-btn');
    const reminderTitle = document.getElementById('reminder-title');
    const reminderTime = document.getElementById('reminder-time');
    const reminderDesc = document.getElementById('reminder-desc');

    let currentUser = JSON.parse(localStorage.getItem('chronoPlan_user')) || null;
    let userSettings = JSON.parse(localStorage.getItem('chronoPlan_settings')) || { ringtone: 'chime', volume: 0.8 };

    // --- Initialization ---
    function init() {
        displayCurrentDate();
        renderLists();
        renderTasks();
        updateListSelect();
        setupEventListeners();
        applyUserStatus();
        setInterval(checkReminders, 10000); // Check every 10 seconds

        if (userSettings.ringtone) {
            ringtoneSelect.value = userSettings.ringtone;
            updateRingtonePlate();
        }

        plateVolumeSlider.value = (userSettings.volume || 0.8) * 100;
        plateVolumeValue.textContent = `${plateVolumeSlider.value}%`;
        updateAllAudioVolume();
    }

    // --- Core Functions ---
    function displayCurrentDate() {
        const now = new Date();
        const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
        currentDateDisplay.textContent = now.toLocaleDateString('en-US', options);
    }

    function renderLists() {
        listsContainer.innerHTML = '';
        lists.forEach(list => {
            const listBtn = document.createElement('button');
            listBtn.className = 'nav-item';
            listBtn.dataset.list = list;
            listBtn.innerHTML = `<i data-lucide="hash"></i> ${list}`;
            listBtn.addEventListener('click', () => {
                filterByList(list);
                updateActiveNav(listBtn);
            });
            listsContainer.appendChild(listBtn);
        });
        lucide.createIcons();
    }

    function updateListSelect() {
        taskListSelect.innerHTML = lists.map(list => `<option value="${list}">${list}</option>`).join('');
    }

    function renderTasks() {
        const searchTerm = searchInput.value.toLowerCase();

        let filteredTasks = tasks.filter(task => {
            const matchesSearch = task.title.toLowerCase().includes(searchTerm) ||
                task.desc.toLowerCase().includes(searchTerm);

            if (!matchesSearch) return false;

            const taskDate = new Date(task.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (currentFilter === 'today') {
                return task.date === today.toISOString().split('T')[0];
            } else if (currentFilter === 'upcoming') {
                return taskDate > today;
            } else if (lists.includes(currentFilter)) {
                return task.list === currentFilter;
            }

            return true;
        });

        // Sort by time
        filteredTasks.sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.time.localeCompare(b.time);
        });

        tasksContainer.innerHTML = '';

        if (filteredTasks.length === 0) {
            tasksContainer.innerHTML = `<div class="empty-state">No tasks found in this view.</div>`;
            return;
        }

        filteredTasks.forEach((task, index) => {
            const card = document.createElement('div');
            const staggerClass = `stagger-${(index % 5) + 1}`;
            card.className = `task-card ${staggerClass} ${task.completed ? 'completed' : ''}`;
            card.dataset.id = task.id;
            card.style.cursor = 'pointer';

            card.innerHTML = `
                <div class="task-header">
                    <span class="task-tag">${task.list}</span>
                    <div class="task-actions">
                        <i data-lucide="trash-2" class="action-icon delete-task" data-id="${task.id}"></i>
                    </div>
                </div>
                <div class="task-title">
                    <div class="task-checkbox ${task.completed ? 'checked' : ''}" data-id="${task.id}">
                        ${task.completed ? '<i data-lucide="check"></i>' : ''}
                    </div>
                    <span>${task.title}</span>
                </div>
                <p class="task-desc" style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 12px;">${task.desc}</p>
                <div class="task-footer">
                    <div class="task-info">
                        <div class="info-item">
                            <i data-lucide="calendar"></i>
                            <span>${formatDate(task.date)}</span>
                        </div>
                        <div class="info-item">
                            <i data-lucide="clock"></i>
                            <span>${task.time}</span>
                        </div>
                    </div>
                    ${task.reminder ? '<i data-lucide="bell" style="color: var(--accent-purple); width: 14px;"></i>' : ''}
                </div>
            `;

            tasksContainer.appendChild(card);
        });

        lucide.createIcons();
        attachTaskListeners();
    }

    function formatDate(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    function saveTasks() {
        localStorage.setItem('chronoPlan_tasks', JSON.stringify(tasks));
    }

    function saveLists() {
        localStorage.setItem('chronoPlan_lists', JSON.stringify(lists));
    }

    function updateRingtonePlate() {
        if (!ringtoneSelect.value) {
            ringtonePlate.style.display = 'none';
            return;
        }

        ringtonePlate.style.display = 'block';
        const selectedOption = ringtoneSelect.options[ringtoneSelect.selectedIndex];
        plateSoundName.textContent = selectedOption.textContent;
        plateStatus.textContent = 'Ready';
        plateStatus.style.color = 'var(--text-secondary)';
    }

    function checkReminders() {
        const now = new Date();
        const currentTimeStr = now.toTimeString().slice(0, 5);
        const currentDateStr = now.toISOString().split('T')[0];

        tasks.forEach(task => {
            if (task.reminder && !task.completed && task.date === currentDateStr && task.time === currentTimeStr) {
                if (!triggeredReminders.has(task.id)) {
                    triggerAlarm(task);
                }
            }
        });
    }

    function triggerAlarm(task) {
        currentAlarmTask = task;
        triggeredReminders.add(task.id);

        reminderTitle.textContent = task.title;
        reminderTime.textContent = `Time: ${task.time}`;
        reminderDesc.textContent = task.desc || 'No description provided.';

        reminderModal.classList.add('active');
        playRingtone();

        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Task Reminder', { body: task.title });
        }
    }

    // --- Event Listeners ---
    function setupEventListeners() {
        // Modal general close
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                taskModal.classList.remove('active');
                loginModal.classList.remove('active');
                settingsModal.classList.remove('active');
            });
        });

        newTaskBtn.addEventListener('click', () => {
            editingTaskId = null;
            taskForm.reset();
            document.querySelector('#task-modal h2').textContent = 'Create New Task';
            document.querySelector('#task-modal .btn-primary').textContent = 'Save Task';
            taskModal.classList.add('active');
            // Set default date to today
            document.getElementById('task-date').value = new Date().toISOString().split('T')[0];
        });

        closeModalBtns.forEach(btn => {
            btn.addEventListener('click', () => taskModal.classList.remove('active'));
        });

        taskForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const taskData = {
                title: document.getElementById('task-title').value,
                date: document.getElementById('task-date').value,
                time: document.getElementById('task-time').value,
                list: document.getElementById('task-list').value,
                desc: document.getElementById('task-desc').value,
                reminder: document.getElementById('task-reminder').checked
            };

            if (editingTaskId) {
                const index = tasks.findIndex(t => t.id === editingTaskId);
                if (index !== -1) {
                    tasks[index] = { ...tasks[index], ...taskData };
                }
            } else {
                const newTask = {
                    id: Date.now().toString(),
                    ...taskData,
                    completed: false
                };
                tasks.push(newTask);
            }

            saveTasks();
            renderTasks();
            taskModal.classList.remove('active');
            taskForm.reset();
            editingTaskId = null;

            if (taskData.reminder && !editingTaskId) {
                notifyUser(`Reminder set for "${taskData.title}" at ${taskData.time}`);
            }
        });

        document.getElementById('add-list-btn').addEventListener('click', () => {
            const listName = prompt('Enter name for new list:');
            if (listName && !lists.includes(listName)) {
                lists.push(listName);
                saveLists();
                renderLists();
                updateListSelect();
            }
        });

        searchInput.addEventListener('input', renderTasks);

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                currentFilter = item.dataset.filter;
                currentViewTitle.textContent = item.textContent.trim();
                updateActiveNav(item);
                renderTasks();
            });
        });

        // Settings & Login Listeners
        settingsBtn.addEventListener('click', () => settingsModal.classList.add('active'));

        userProfile.addEventListener('click', () => {
            if (!currentUser) loginModal.classList.add('active');
            else settingsModal.classList.add('active');
        });

        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            handleSocialLogin(email, email.split('@')[0], 'Direct');
        });

        document.getElementById('google-login-btn').addEventListener('click', () => {
            handleSocialLogin('user@gmail.com', 'Google User', 'Google');
        });

        document.getElementById('microsoft-login-btn').addEventListener('click', () => {
            handleSocialLogin('user@outlook.com', 'Microsoft User', 'Microsoft');
        });

        logoutBtn.addEventListener('click', () => {
            currentUser = null;
            localStorage.removeItem('chronoPlan_user');
            applyUserStatus();
            settingsModal.classList.remove('active');
        });

        ringtoneSelect.addEventListener('change', () => {
            userSettings.ringtone = ringtoneSelect.value;
            localStorage.setItem('chronoPlan_settings', JSON.stringify(userSettings));
            updateRingtonePlate();
            stopRingtone();
        });

        platePlayBtn.addEventListener('click', () => {
            playRingtone();
            plateStatus.textContent = 'Playing...';
            plateStatus.style.color = 'var(--accent-blue)';
        });

        plateStopBtn.addEventListener('click', () => {
            stopRingtone();
            plateStatus.textContent = 'Stopped';
            plateStatus.style.color = 'var(--text-secondary)';
        });

        plateVolumeSlider.addEventListener('input', () => {
            const vol = plateVolumeSlider.value / 100;
            userSettings.volume = vol;
            plateVolumeValue.textContent = `${plateVolumeSlider.value}%`;
            localStorage.setItem('chronoPlan_settings', JSON.stringify(userSettings));
            updateAllAudioVolume();
        });

        document.getElementById('clear-data-btn').addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
                localStorage.clear();
                location.reload();
            }
        });

        // Mobile Sidebar Logic
        if (mobileMenuToggle) {
            mobileMenuToggle.addEventListener('click', () => {
                sidebar.classList.add('active');
                sidebarOverlay.classList.add('active');
            });
        }

        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', () => {
                sidebar.classList.remove('active');
                sidebarOverlay.classList.remove('active');
            });
        }

        // Close sidebar on nav item click (mobile)
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 1024) {
                    sidebar.classList.remove('active');
                    sidebarOverlay.classList.remove('active');
                }
            });
        });

        // Alarm Handlers
        stopAlarmBtn.addEventListener('click', () => {
            stopRingtone();
            reminderModal.classList.remove('active');
            currentAlarmTask = null;
        });

        snoozeBtn.addEventListener('click', () => {
            if (!currentAlarmTask) return;

            stopRingtone();
            reminderModal.classList.remove('active');

            // Snooze: Re-schedule for 5 minutes later
            const [hours, minutes] = currentAlarmTask.time.split(':').map(Number);
            let snoozeDate = new Date();
            snoozeDate.setHours(hours);
            snoozeDate.setMinutes(minutes + 5);

            const snoozeTimeStr = snoozeDate.toTimeString().slice(0, 5);

            // Find task and update it
            const taskIndex = tasks.findIndex(t => t.id === currentAlarmTask.id);
            if (taskIndex !== -1) {
                tasks[taskIndex].time = snoozeTimeStr;
                triggeredReminders.delete(currentAlarmTask.id); // Allow it to fire again
                saveTasks();
                renderTasks();
            }

            currentAlarmTask = null;
        });
    }

    function handleSocialLogin(email, name, provider) {
        currentUser = { email, name, provider };
        localStorage.setItem('chronoPlan_user', JSON.stringify(currentUser));
        applyUserStatus();
        loginModal.classList.remove('active');
        notifyUser(`Welcome back! Logged in via ${provider}`);
    }

    function applyUserStatus() {
        const userNameEl = document.querySelector('.user-name');
        const userPlanEl = document.querySelector('.user-plan');
        const avatarEl = document.querySelector('.avatar');

        if (currentUser) {
            userNameEl.textContent = currentUser.name.charAt(0).toUpperCase() + currentUser.name.slice(1);
            userPlanEl.textContent = 'Pro Member';
            avatarEl.textContent = currentUser.name.charAt(0).toUpperCase();
        } else {
            userNameEl.textContent = 'Guest User';
            userPlanEl.textContent = 'Click to Login';
            avatarEl.textContent = '?';
        }
    }

    function playRingtone() {
        // Stop any currently playing audio first
        stopRingtone();

        const sound = document.getElementById(`sound-${userSettings.ringtone}`);
        if (sound) {
            sound.volume = userSettings.volume || 0.8;
            sound.currentTime = 0;
            sound.play().catch(e => console.log("Audio play failed:", e));
        }
    }

    function updateAllAudioVolume() {
        const sounds = document.querySelectorAll('audio');
        sounds.forEach(s => {
            s.volume = userSettings.volume || 0.8;
        });
    }

    function stopRingtone() {
        const sounds = document.querySelectorAll('audio');
        sounds.forEach(s => {
            s.pause();
            s.currentTime = 0;
        });
    }

    function attachTaskListeners() {
        document.querySelectorAll('.task-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Ignore clicks on checkbox and delete icon
                if (e.target.closest('.task-checkbox') || e.target.closest('.delete-task')) return;

                const id = card.dataset.id;
                const task = tasks.find(t => t.id === id);
                if (task) {
                    openEditModal(task);
                }
            });
        });

        document.querySelectorAll('.delete-task').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                tasks = tasks.filter(t => t.id !== id);
                saveTasks();
                renderTasks();
            });
        });

        document.querySelectorAll('.task-checkbox').forEach(box => {
            box.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = box.dataset.id;
                const task = tasks.find(t => t.id === id);
                if (task) {
                    task.completed = !task.completed;
                    saveTasks();
                    renderTasks();
                }
            });
        });
    }

    function openEditModal(task) {
        editingTaskId = task.id;
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-date').value = task.date;
        document.getElementById('task-time').value = task.time;
        document.getElementById('task-list').value = task.list;
        document.getElementById('task-desc').value = task.desc;
        document.getElementById('task-reminder').checked = task.reminder;

        document.querySelector('#task-modal h2').textContent = 'Edit Task';
        document.querySelector('#task-modal .btn-primary').textContent = 'Save Changes';
        taskModal.classList.add('active');
    }

    function updateActiveNav(activeItem) {
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        activeItem.classList.add('active');
    }

    function filterByList(listName) {
        currentFilter = listName;
        currentViewTitle.textContent = listName + ' Tasks';
        renderTasks();
    }

    function notifyUser(message) {
        playRingtone();

        if ('Notification' in window) {
            if (Notification.permission === 'granted') {
                new Notification('ChronoPlan', { body: message });
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        new Notification('ChronoPlan', { body: message });
                    }
                });
            }
        }
        console.log('Notification:', message);
    }

    init();
});
